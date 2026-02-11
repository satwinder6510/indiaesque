"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import MarkdownEditor from "../components/MarkdownEditor";

interface ViatorConfig {
  destinationId: number;
  tagIds?: number[];
  enabled: boolean;
}

interface SubPage {
  slug: string;
  citySlug: string;
  title: string;
  type: string;
  description: string;
  content: string;
  viator?: ViatorConfig;
  relatedPages: string[];
}

interface CityHub {
  name: string;
  facts?: string[];
}

const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "conversational", label: "Conversational" },
  { value: "enthusiastic", label: "Enthusiastic" },
  { value: "practical", label: "Practical" },
];

export default function SubPageEditor() {
  const params = useParams();
  const citySlug = params.city as string;
  const pageSlug = params.page as string;
  const router = useRouter();

  const [page, setPage] = useState<SubPage | null>(null);
  const [cityHub, setCityHub] = useState<CityHub | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"generate" | "editor" | "viator">("generate");

  // Generation settings
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("professional");
  const [wordCount, setWordCount] = useState(800);

  // Editor content
  const [editorContent, setEditorContent] = useState("");

  // Load page and city hub data
  useEffect(() => {
    Promise.all([
      fetch(`/api/content/pages?city=${citySlug}&page=${pageSlug}`).then(r => r.json()),
      fetch(`/api/content?city=${citySlug}`).then(r => r.json())
    ])
      .then(([pageData, hubData]) => {
        if (pageData.error) throw new Error(pageData.error);
        setPage(pageData.page);
        setEditorContent(pageData.page.content || "");
        setTopic(pageData.page.title || "");

        if (hubData.hub) {
          setCityHub(hubData.hub);
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
          updates: { ...page, content: editorContent }
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

  const handleAutoSave = useCallback(
    async (content: string) => {
      if (!page) return;
      // Auto-save is optional for sub-pages, just update local state
      setEditorContent(content);
    },
    [page]
  );

  const handleGenerate = async () => {
    if (!page || !topic.trim()) {
      setError("Please enter a topic to generate content about");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cityName: cityHub?.name || citySlug,
          question: topic,
          contentDirection: `Create a detailed, SEO-optimized article about "${topic}" for ${cityHub?.name || citySlug}. This is a sub-page of the main city guide.`,
          tone,
          wordCount,
          facts: cityHub?.facts || [],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setEditorContent(data.answer);
      setSuccess(`Generated ${data.wordCount} words!`);
      setTimeout(() => setSuccess(null), 5000);
      setActiveTab("editor");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const getWordCount = () => {
    return editorContent?.split(/\s+/).filter(w => w).length || 0;
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
      <header className="bg-[var(--background-card)] border-b border-[var(--border)] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-10 h-10 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center font-bold hover:bg-[var(--primary-light)] transition-colors">
              IE
            </Link>
            <div>
              <h1 className="font-semibold text-[var(--foreground)]">{page.title}</h1>
              <p className="text-sm text-[var(--foreground-muted)]">/{citySlug}/{pageSlug} · {getWordCount()} words</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
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
            { id: "generate", label: "AI Generate" },
            { id: "editor", label: "Editor" },
            { id: "viator", label: "Viator" },
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

        {/* AI Generate Tab */}
        {activeTab === "generate" && (
          <div className="space-y-6">
            <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] p-6">
              <h3 className="font-semibold text-[var(--foreground)] mb-4">Generate Content with AI</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    Topic / Question
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Best street food in Old Delhi, Is Delhi safe for solo travelers?"
                    className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
                  />
                  <p className="text-xs text-[var(--foreground-muted)] mt-1">
                    Enter a specific topic or question for this page
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                      Tone
                    </label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
                    >
                      {TONE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                      Word Count
                    </label>
                    <select
                      value={wordCount}
                      onChange={(e) => setWordCount(parseInt(e.target.value))}
                      className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
                    >
                      <option value={500}>~500 words (short)</option>
                      <option value={800}>~800 words (medium)</option>
                      <option value={1200}>~1200 words (long)</option>
                      <option value={1500}>~1500 words (detailed)</option>
                    </select>
                  </div>
                </div>

                {cityHub?.facts && cityHub.facts.length > 0 && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      <strong>{cityHub.facts.length} facts</strong> from {cityHub.name} hub will be included in generation
                    </p>
                  </div>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={generating || !topic.trim()}
                  className="w-full px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-light)] disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
                >
                  {generating ? "Generating..." : "Generate Content"}
                </button>
              </div>
            </div>

            {editorContent && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                <p className="text-sm text-green-700 dark:text-green-400">
                  Content generated! Switch to the <strong>Editor</strong> tab to review and edit.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Editor Tab */}
        {activeTab === "editor" && (
          <div className="space-y-6">
            {/* Page Meta */}
            <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] p-6">
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
                    placeholder="SEO description (120-155 characters)..."
                  />
                  <p className="text-xs text-[var(--foreground-muted)] mt-1">
                    {page.description?.length || 0}/155 characters
                  </p>
                </div>
              </div>
            </div>

            {/* Markdown Editor */}
            <MarkdownEditor
              value={editorContent}
              onChange={setEditorContent}
              onAutoSave={handleAutoSave}
              placeholder="Write your content in markdown..."
            />
          </div>
        )}

        {/* Viator Tab */}
        {activeTab === "viator" && (
          <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] p-6">
            <h3 className="font-semibold text-[var(--foreground)] mb-4">Viator Tour Integration</h3>
            <div className="space-y-4">
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
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
