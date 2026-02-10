"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface ViatorConfig {
  destinationId: number;
  tagIds?: number[];
  enabled: boolean;
}

interface GalleryImage {
  url: string;
  caption?: string;
}

interface ContentBlock {
  id: string;
  type: "heading" | "text" | "gallery" | "divider";
  content?: string;
  level?: 2 | 3;
  images?: GalleryImage[]; // For gallery - up to 3 images
}

interface SubPage {
  slug: string;
  citySlug: string;
  title: string;
  type: string;
  description: string;
  content: string;
  blocks?: ContentBlock[];
  viator?: ViatorConfig;
  relatedPages: string[];
}

const VIATOR_TAGS = [
  { id: 21911, name: "Tours & Sightseeing" },
  { id: 21912, name: "Food & Drink" },
  { id: 21913, name: "Cultural Experiences" },
  { id: 21914, name: "Walking Tours" },
  { id: 21915, name: "Day Trips" },
  { id: 21916, name: "Private Tours" },
  { id: 21917, name: "Photography Tours" },
  { id: 21918, name: "Cooking Classes" },
];

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export default function SubPageEditor() {
  const params = useParams();
  const citySlug = params.city as string;
  const pageSlug = params.page as string;
  const router = useRouter();

  const [page, setPage] = useState<SubPage | null>(null);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"content" | "viator" | "linking">("content");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUpload, setActiveUpload] = useState<{ blockId: string; imageIndex: number } | null>(null);

  useEffect(() => {
    fetch(`/api/content/pages?city=${citySlug}&page=${pageSlug}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setPage(data.page);
        if (data.page.blocks && data.page.blocks.length > 0) {
          setBlocks(data.page.blocks);
        } else {
          setBlocks([
            { id: generateId(), type: "heading", content: "", level: 2 },
            { id: generateId(), type: "text", content: "" },
          ]);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [citySlug, pageSlug]);

  const handleSave = async () => {
    if (!page) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/content/pages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          citySlug,
          slug: pageSlug,
          updates: { ...page, blocks }
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setSuccess("Saved successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const addBlock = (type: ContentBlock["type"], afterId?: string) => {
    const newBlock: ContentBlock = {
      id: generateId(),
      type,
      content: "",
      level: type === "heading" ? 2 : undefined,
      images: type === "gallery" ? [{ url: "" }, { url: "" }, { url: "" }] : undefined,
    };

    if (afterId) {
      const index = blocks.findIndex(b => b.id === afterId);
      const newBlocks = [...blocks];
      newBlocks.splice(index + 1, 0, newBlock);
      setBlocks(newBlocks);
    } else {
      setBlocks([...blocks, newBlock]);
    }
  };

  const updateBlock = (id: string, updates: Partial<ContentBlock>) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const updateGalleryImage = (blockId: string, imageIndex: number, updates: Partial<GalleryImage>) => {
    setBlocks(blocks.map(b => {
      if (b.id === blockId && b.images) {
        const newImages = [...b.images];
        newImages[imageIndex] = { ...newImages[imageIndex], ...updates };
        return { ...b, images: newImages };
      }
      return b;
    }));
  };

  const deleteBlock = (id: string) => {
    if (blocks.length <= 1) return;
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const moveBlock = (id: string, direction: "up" | "down") => {
    const index = blocks.findIndex(b => b.id === id);
    if (direction === "up" && index > 0) {
      const newBlocks = [...blocks];
      [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
      setBlocks(newBlocks);
    } else if (direction === "down" && index < blocks.length - 1) {
      const newBlocks = [...blocks];
      [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
      setBlocks(newBlocks);
    }
  };

  const handleImageUpload = async (blockId: string, imageIndex: number, file: File) => {
    setUploading(`${blockId}-${imageIndex}`);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", `${citySlug}-${pageSlug}-${blockId}-${imageIndex}-${Date.now()}`);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.url) {
        updateGalleryImage(blockId, imageIndex, { url: data.url });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeUpload) {
      handleImageUpload(activeUpload.blockId, activeUpload.imageIndex, file);
    }
    e.target.value = "";
  };

  const triggerImageUpload = (blockId: string, imageIndex: number) => {
    setActiveUpload({ blockId, imageIndex });
    fileInputRef.current?.click();
  };

  const handleTagToggle = (tagId: number) => {
    if (!page?.viator) return;
    const currentTags = page.viator.tagIds || [];
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter(t => t !== tagId)
      : [...currentTags, tagId];
    setPage({ ...page, viator: { ...page.viator, tagIds: newTags } });
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const getWordCount = () => {
    return blocks
      .filter(b => b.type === "text" || b.type === "heading")
      .reduce((sum, b) => sum + (b.content?.trim().split(/\s+/).filter(w => w).length || 0), 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-[var(--foreground-muted)]">Loading...</div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">Page not found</h2>
          <Link href={`/content/${citySlug}`} className="text-[var(--primary)]">Back to Hub</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      <header className="bg-[var(--background-card)] border-b border-[var(--border)] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-10 h-10 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center font-bold hover:bg-[var(--primary-light)] transition-colors">
              IE
            </Link>
            <div>
              <h1 className="font-semibold text-[var(--foreground)]">{page.title}</h1>
              <p className="text-sm text-[var(--foreground-muted)]">/{citySlug}/{pageSlug}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--foreground-muted)]">{getWordCount()} words</span>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <Link
          href={`/content/${citySlug}`}
          className="inline-flex items-center gap-1 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to {citySlug.charAt(0).toUpperCase() + citySlug.slice(1)} Hub
        </Link>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl text-sm">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[var(--background-card)] p-1 rounded-xl w-fit border border-[var(--border)]">
          {[
            { id: "content", label: "Content Blocks" },
            { id: "viator", label: "Viator Tours" },
            { id: "linking", label: "Internal Links" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Tab - Block Editor */}
        {activeTab === "content" && (
          <div className="space-y-4">
            {/* Page Meta */}
            <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] p-6 mb-6">
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Page Title</label>
                  <input
                    type="text"
                    value={page.title}
                    onChange={(e) => setPage({ ...page, title: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] text-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Meta Description</label>
                  <textarea
                    value={page.description}
                    onChange={(e) => setPage({ ...page, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
                    placeholder="SEO description for this page..."
                  />
                </div>
              </div>
            </div>

            {/* Block Editor */}
            <div className="space-y-3">
              {blocks.map((block, index) => (
                <div key={block.id} className="group relative">
                  {/* Block Controls */}
                  <div className="absolute -left-12 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => moveBlock(block.id, "up")}
                      disabled={index === 0}
                      className="p-1 text-[var(--foreground-muted)] hover:text-[var(--foreground)] disabled:opacity-30"
                      title="Move up"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveBlock(block.id, "down")}
                      disabled={index === blocks.length - 1}
                      className="p-1 text-[var(--foreground-muted)] hover:text-[var(--foreground)] disabled:opacity-30"
                      title="Move down"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteBlock(block.id)}
                      className="p-1 text-[var(--foreground-muted)] hover:text-red-500"
                      title="Delete block"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Block Content */}
                  <div className="bg-[var(--background-card)] rounded-xl border border-[var(--border)] overflow-hidden">
                    {/* Block Type Badge */}
                    <div className="px-4 py-2 bg-[var(--background)] border-b border-[var(--border)] flex items-center justify-between">
                      <span className="text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wide">
                        {block.type === "heading" && `Heading ${block.level || 2}`}
                        {block.type === "text" && "Text"}
                        {block.type === "gallery" && "Image Gallery (3)"}
                        {block.type === "divider" && "Divider"}
                      </span>
                      {block.type === "heading" && (
                        <select
                          value={block.level || 2}
                          onChange={(e) => updateBlock(block.id, { level: parseInt(e.target.value) as 2 | 3 })}
                          className="text-xs bg-transparent border border-[var(--border)] rounded px-2 py-1"
                        >
                          <option value={2}>H2</option>
                          <option value={3}>H3</option>
                        </select>
                      )}
                    </div>

                    {/* Block Editor */}
                    <div className="p-4">
                      {block.type === "heading" && (
                        <input
                          type="text"
                          value={block.content || ""}
                          onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                          placeholder="Section heading..."
                          className={`w-full bg-transparent border-none outline-none text-[var(--foreground)] ${
                            block.level === 3 ? "text-xl font-semibold" : "text-2xl font-bold"
                          }`}
                        />
                      )}

                      {block.type === "text" && (
                        <textarea
                          value={block.content || ""}
                          onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                          placeholder="Write your content here..."
                          rows={6}
                          className="w-full bg-transparent border-none outline-none text-[var(--foreground)] resize-none leading-relaxed"
                        />
                      )}

                      {block.type === "gallery" && (
                        <div>
                          {/* 3 Image Gallery - responsive grid, swipeable on mobile */}
                          <div className="grid grid-cols-3 gap-3 overflow-x-auto snap-x snap-mandatory md:overflow-visible md:snap-none">
                            {[0, 1, 2].map((imageIndex) => {
                              const image = block.images?.[imageIndex] || { url: "" };
                              const isUploading = uploading === `${block.id}-${imageIndex}`;

                              return (
                                <div key={imageIndex} className="snap-center min-w-[calc(100%-1rem)] md:min-w-0">
                                  {image.url ? (
                                    <div className="space-y-2">
                                      <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-[var(--background)]">
                                        <img
                                          src={image.url}
                                          alt={image.caption || `Image ${imageIndex + 1}`}
                                          className="w-full h-full object-cover"
                                        />
                                        <button
                                          onClick={() => triggerImageUpload(block.id, imageIndex)}
                                          className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
                                          title="Replace image"
                                        >
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                          </svg>
                                        </button>
                                      </div>
                                      <input
                                        type="text"
                                        value={image.caption || ""}
                                        onChange={(e) => updateGalleryImage(block.id, imageIndex, { caption: e.target.value })}
                                        placeholder="Caption..."
                                        className="w-full px-2 py-1 bg-[var(--background)] border border-[var(--border)] rounded text-xs text-[var(--foreground)]"
                                      />
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => triggerImageUpload(block.id, imageIndex)}
                                      disabled={isUploading}
                                      className="w-full aspect-[4/3] rounded-lg border-2 border-dashed border-[var(--border)] hover:border-[var(--primary)] flex flex-col items-center justify-center gap-1 transition-colors"
                                    >
                                      {isUploading ? (
                                        <>
                                          <svg className="animate-spin w-6 h-6 text-[var(--primary)]" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                          </svg>
                                        </>
                                      ) : (
                                        <>
                                          <svg className="w-6 h-6 text-[var(--foreground-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                                          </svg>
                                          <span className="text-xs text-[var(--foreground-muted)]">Image {imageIndex + 1}</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-xs text-[var(--foreground-muted)] mt-3 text-center">
                            3 images side-by-side on desktop, swipe on mobile
                          </p>
                        </div>
                      )}

                      {block.type === "divider" && (
                        <hr className="border-t-2 border-[var(--border)]" />
                      )}
                    </div>
                  </div>

                  {/* Add Block Button (appears between blocks) */}
                  <div className="flex justify-center py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-1 bg-[var(--background-card)] border border-[var(--border)] rounded-lg p-1">
                      <button
                        onClick={() => addBlock("heading", block.id)}
                        className="px-2 py-1 text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded"
                      >
                        H2
                      </button>
                      <button
                        onClick={() => addBlock("text", block.id)}
                        className="px-2 py-1 text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded"
                      >
                        Text
                      </button>
                      <button
                        onClick={() => addBlock("gallery", block.id)}
                        className="px-2 py-1 text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded"
                      >
                        Gallery
                      </button>
                      <button
                        onClick={() => addBlock("divider", block.id)}
                        className="px-2 py-1 text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded"
                      >
                        ―
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Block Buttons */}
            <div className="flex justify-center pt-4">
              <div className="flex gap-2">
                <button
                  onClick={() => addBlock("heading")}
                  className="px-4 py-2 bg-[var(--background-card)] border border-[var(--border)] hover:border-[var(--primary)] text-[var(--foreground)] rounded-lg text-sm transition-colors"
                >
                  + Heading
                </button>
                <button
                  onClick={() => addBlock("text")}
                  className="px-4 py-2 bg-[var(--background-card)] border border-[var(--border)] hover:border-[var(--primary)] text-[var(--foreground)] rounded-lg text-sm transition-colors"
                >
                  + Text
                </button>
                <button
                  onClick={() => addBlock("gallery")}
                  className="px-4 py-2 bg-[var(--background-card)] border border-[var(--border)] hover:border-[var(--primary)] text-[var(--foreground)] rounded-lg text-sm transition-colors"
                >
                  + Gallery
                </button>
                <button
                  onClick={() => addBlock("divider")}
                  className="px-4 py-2 bg-[var(--background-card)] border border-[var(--border)] hover:border-[var(--primary)] text-[var(--foreground)] rounded-lg text-sm transition-colors"
                >
                  + Divider
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Viator Tab */}
        {activeTab === "viator" && (
          <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] p-6">
            <h3 className="font-semibold text-[var(--foreground)] mb-4">Viator Tour Integration</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="viator-enabled"
                  checked={page.viator?.enabled || false}
                  onChange={(e) => setPage({
                    ...page,
                    viator: { ...page.viator!, enabled: e.target.checked }
                  })}
                  className="w-5 h-5 rounded border-[var(--border)] text-[var(--primary)]"
                />
                <label htmlFor="viator-enabled" className="text-[var(--foreground)]">Show Viator tours on this page</label>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Destination ID</label>
                <input
                  type="number"
                  value={page.viator?.destinationId || 0}
                  onChange={(e) => setPage({
                    ...page,
                    viator: { ...page.viator!, destinationId: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full max-w-xs px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-3">Filter by Tour Type</label>
                <div className="flex flex-wrap gap-2">
                  {VIATOR_TAGS.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => handleTagToggle(tag.id)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        page.viator?.tagIds?.includes(tag.id)
                          ? "bg-[var(--primary)] text-white"
                          : "bg-[var(--background)] text-[var(--foreground-muted)] hover:bg-[var(--border)]"
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Linking Tab */}
        {activeTab === "linking" && (
          <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] p-6">
            <h3 className="font-semibold text-[var(--foreground)] mb-4">Internal Linking</h3>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Related Pages</label>
              <input
                type="text"
                value={page.relatedPages.join(", ")}
                onChange={(e) => setPage({
                  ...page,
                  relatedPages: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                })}
                className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
                placeholder="e.g., khan-market-guide, hauz-khas-guide"
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
