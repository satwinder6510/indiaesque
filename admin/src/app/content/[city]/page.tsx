"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface HubSection {
  id: string;
  title: string;
  content: string;
}

interface ViatorConfig {
  destinationId: number;
  tagIds?: number[];
  enabled: boolean;
}

interface CityHub {
  slug: string;
  name: string;
  title: string;
  description: string;
  sections: HubSection[];
  viator: ViatorConfig;
  generatedContent?: string;
}

interface SubPage {
  slug: string;
  title: string;
  type: string;
  description: string;
}

interface PAAQuestion {
  question: string;
  category: string;
  searchVolume: string;
  selected?: boolean;
}

const PAGE_TYPES = [
  { value: "area-guide", label: "Area Guide" },
  { value: "itinerary", label: "Itinerary" },
  { value: "topic", label: "Topic Page" },
  { value: "attraction", label: "Attraction" },
];

export default function CityHubPage() {
  const params = useParams();
  const citySlug = params.city as string;
  const router = useRouter();

  const [hub, setHub] = useState<CityHub | null>(null);
  const [pages, setPages] = useState<SubPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"seo" | "pages" | "viator">("seo");
  const [showAddPageModal, setShowAddPageModal] = useState(false);

  // PAA Research state
  const [paaQuestions, setPaaQuestions] = useState<PAAQuestion[]>([]);
  const [researching, setResearching] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch(`/api/content?city=${citySlug}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setHub(data.hub);
        setPages(data.pages || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [citySlug]);

  const handleSaveHub = async () => {
    if (!hub) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: citySlug, updates: hub }),
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

  const handleResearchPAA = async () => {
    if (!hub) return;
    setResearching(true);
    setError(null);

    try {
      const res = await fetch("/api/content/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityName: hub.name, action: "research" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPaaQuestions(data.questions.map((q: PAAQuestion) => ({ ...q, selected: true })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research failed");
    } finally {
      setResearching(false);
    }
  };

  const handleGenerateContent = async () => {
    if (!hub || paaQuestions.length === 0) return;
    setGenerating(true);
    setError(null);

    const selectedQuestions = paaQuestions.filter(q => q.selected);
    if (selectedQuestions.length === 0) {
      setError("Please select at least one question");
      setGenerating(false);
      return;
    }

    try {
      const res = await fetch("/api/content/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cityName: hub.name,
          action: "generate",
          questions: selectedQuestions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setHub({ ...hub, generatedContent: data.content });
      setSuccess(`Generated ${data.wordCount} words of SEO content!`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const toggleQuestion = (index: number) => {
    setPaaQuestions(paaQuestions.map((q, i) =>
      i === index ? { ...q, selected: !q.selected } : q
    ));
  };

  const handleDeletePage = async (pageSlug: string) => {
    if (!confirm("Delete this page?")) return;

    try {
      const res = await fetch(`/api/content/pages?city=${citySlug}&page=${pageSlug}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setPages(pages.filter(p => p.slug !== pageSlug));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const getWordCount = () => {
    return hub?.generatedContent?.split(/\s+/).filter(w => w).length || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-[var(--foreground-muted)]">Loading...</div>
      </div>
    );
  }

  if (!hub) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">Hub not found</h2>
          <Link href="/content" className="text-[var(--primary)]">Back to Content</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="bg-[var(--background-card)] border-b border-[var(--border)] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-10 h-10 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center font-bold hover:bg-[var(--primary-light)] transition-colors">
              IE
            </Link>
            <div>
              <h1 className="font-semibold text-[var(--foreground)]">{hub.name} Hub</h1>
              <p className="text-sm text-[var(--foreground-muted)]">{pages.length} sub-pages • {getWordCount()} words</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveHub}
              disabled={saving}
              className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
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

      <main className="max-w-6xl mx-auto px-6 py-8">
        <Link
          href="/content"
          className="inline-flex items-center gap-1 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Content Hubs
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
            { id: "seo", label: "SEO Content" },
            { id: "pages", label: "Sub-Pages" },
            { id: "viator", label: "Viator Settings" },
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

        {/* SEO Content Tab */}
        {activeTab === "seo" && (
          <div className="space-y-6">
            {/* Meta Info */}
            <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] p-6">
              <h3 className="font-semibold text-[var(--foreground)] mb-4">Page Meta</h3>
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Page Title (H1)</label>
                  <input
                    type="text"
                    value={hub.title}
                    onChange={(e) => setHub({ ...hub, title: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
                    placeholder="e.g., Delhi Travel Guide: Everything You Need to Know 2024"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Meta Description</label>
                  <textarea
                    value={hub.description}
                    onChange={(e) => setHub({ ...hub, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
                    placeholder="155 character SEO description..."
                  />
                  <p className="text-xs text-[var(--foreground-muted)] mt-1">
                    {hub.description?.length || 0}/155 characters
                  </p>
                </div>
              </div>
            </div>

            {/* PAA Research */}
            <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-[var(--foreground)]">PAA Research</h3>
                  <p className="text-sm text-[var(--foreground-muted)]">Research People Also Ask questions for {hub.name}</p>
                </div>
                <button
                  onClick={handleResearchPAA}
                  disabled={researching}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {researching ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Researching...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Research PAA
                    </>
                  )}
                </button>
              </div>

              {paaQuestions.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--foreground-muted)]">
                      {paaQuestions.filter(q => q.selected).length} of {paaQuestions.length} questions selected
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPaaQuestions(paaQuestions.map(q => ({ ...q, selected: true })))}
                        className="text-[var(--primary)] hover:underline"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setPaaQuestions(paaQuestions.map(q => ({ ...q, selected: false })))}
                        className="text-[var(--foreground-muted)] hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-2 max-h-80 overflow-y-auto">
                    {paaQuestions.map((q, i) => (
                      <label
                        key={i}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          q.selected
                            ? "border-[var(--primary)] bg-[var(--primary)]/5"
                            : "border-[var(--border)] hover:border-[var(--primary)]/50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={q.selected}
                          onChange={() => toggleQuestion(i)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className="text-[var(--foreground)]">{q.question}</p>
                          <div className="flex gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 bg-[var(--background)] text-[var(--foreground-muted)] rounded">
                              {q.category}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              q.searchVolume === "high" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                              q.searchVolume === "medium" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                              "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            }`}>
                              {q.searchVolume} volume
                            </span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  <button
                    onClick={handleGenerateContent}
                    disabled={generating || paaQuestions.filter(q => q.selected).length === 0}
                    className="w-full py-3 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {generating ? (
                      <>
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Generating SEO Content...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Generate Hub Content
                      </>
                    )}
                  </button>
                </div>
              )}

              {paaQuestions.length === 0 && (
                <div className="text-center py-8 text-[var(--foreground-muted)]">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p>Click "Research PAA" to find questions people ask about {hub.name}</p>
                </div>
              )}
            </div>

            {/* Generated Content */}
            {hub.generatedContent && (
              <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)]">Generated Hub Content</h3>
                    <p className="text-sm text-[var(--foreground-muted)]">{getWordCount()} words • SEO optimized</p>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(hub.generatedContent || "")}
                    className="px-3 py-1.5 text-sm bg-[var(--background)] hover:bg-[var(--border)] text-[var(--foreground)] rounded-lg transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <textarea
                  value={hub.generatedContent}
                  onChange={(e) => setHub({ ...hub, generatedContent: e.target.value })}
                  rows={30}
                  className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] font-mono text-sm"
                />
              </div>
            )}
          </div>
        )}

        {/* Sub-Pages Tab */}
        {activeTab === "pages" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--foreground)]">Sub-Pages</h3>
              <button
                onClick={() => setShowAddPageModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Page
              </button>
            </div>

            {pages.length === 0 ? (
              <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] p-8 text-center text-[var(--foreground-muted)]">
                No sub-pages yet. Add your first page to build out the hub.
              </div>
            ) : (
              <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] overflow-hidden">
                <div className="divide-y divide-[var(--border)]">
                  {pages.map(page => (
                    <div key={page.slug} className="p-4 flex items-center justify-between hover:bg-[var(--primary)]/5 transition-colors">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 bg-[var(--primary)]/10 text-[var(--primary)] rounded font-medium">
                            {page.type}
                          </span>
                        </div>
                        <h4 className="font-medium text-[var(--foreground)]">{page.title}</h4>
                        <p className="text-sm text-[var(--foreground-muted)]">/{citySlug}/{page.slug}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/content/${citySlug}/${page.slug}`}
                          className="px-3 py-1.5 text-sm font-medium bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--border)] rounded-lg transition-colors"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDeletePage(page.slug)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Viator Settings Tab */}
        {activeTab === "viator" && (
          <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] p-6">
            <h3 className="font-semibold text-[var(--foreground)] mb-4">Viator Integration</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="viator-enabled"
                  checked={hub.viator.enabled}
                  onChange={(e) => setHub({ ...hub, viator: { ...hub.viator, enabled: e.target.checked } })}
                  className="w-5 h-5 rounded border-[var(--border)] text-[var(--primary)]"
                />
                <label htmlFor="viator-enabled" className="text-[var(--foreground)]">Enable Viator tours on this hub</label>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Destination ID</label>
                <input
                  type="number"
                  value={hub.viator.destinationId}
                  onChange={(e) => setHub({ ...hub, viator: { ...hub.viator, destinationId: parseInt(e.target.value) || 0 } })}
                  className="w-full max-w-xs px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
                  placeholder="e.g., 804 for Delhi"
                />
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  Find destination IDs in the Viator partner portal
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {showAddPageModal && (
        <AddPageModal
          citySlug={citySlug}
          onClose={() => setShowAddPageModal(false)}
          onSuccess={(page) => {
            setPages([...pages, page]);
            setShowAddPageModal(false);
            router.push(`/content/${citySlug}/${page.slug}`);
          }}
        />
      )}
    </div>
  );
}

function AddPageModal({
  citySlug,
  onClose,
  onSuccess,
}: {
  citySlug: string;
  onClose: () => void;
  onSuccess: (page: SubPage) => void;
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState("topic");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/content/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ citySlug, slug, title, type }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onSuccess(data.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create page");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--background-card)] rounded-2xl shadow-2xl w-full max-w-md border border-[var(--border)]">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Add Sub-Page</h3>
          <button onClick={onClose} className="p-1 text-[var(--foreground-muted)] hover:text-[var(--foreground)] rounded-lg hover:bg-[var(--border)] transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Page Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
              placeholder="e.g., South Delhi Guide"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">URL Slug</label>
            <div className="flex items-center gap-2">
              <span className="text-[var(--foreground-muted)]">/{citySlug}/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                className="flex-1 px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Page Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
            >
              {PAGE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)] rounded-xl transition-colors font-medium">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim() || !slug.trim()}
              className="px-5 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-light)] disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg transition-all"
            >
              {loading ? "Creating..." : "Create Page"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
