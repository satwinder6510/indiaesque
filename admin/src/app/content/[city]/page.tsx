"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Modal from "./components/Modal";
import MarkdownEditor from "./components/MarkdownEditor";
import VersionHistory from "./components/VersionHistory";
import GenerationControls from "./components/GenerationControls";
import PAAResearchPanel from "./components/PAAResearchPanel";

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

interface PAAQuestion {
  id: string;
  question: string;
  category: string;
  searchVolume: "high" | "medium" | "low";
  selected: boolean;
  researchedAt: string;
}

interface ContentVersion {
  id: string;
  content: string;
  wordCount: number;
  createdAt: string;
  source: "ai" | "manual";
  generationConfig?: {
    tone: string;
    wordCount: number;
    keywords: string[];
    paaQuestionIds: string[];
    expandDirection?: string;
  };
  note?: string;
}

interface CityHub {
  slug: string;
  name: string;
  title: string;
  description: string;
  sections: HubSection[];
  viator: ViatorConfig;
  createdAt: string;
  updatedAt: string;
  generatedContent?: string;
  facts?: string[];  // Current facts to inject into AI prompts
  paaResearch?: {
    questions: PAAQuestion[];
    lastResearchedAt: string;
  };
  currentVersionId?: string;
  versions: ContentVersion[];
  draft?: {
    content: string;
    lastSavedAt: string;
  };
  generationDefaults?: {
    tone: string;
    wordCount: number;
    keywords: string[];
  };
}

interface SubPage {
  slug: string;
  title: string;
  type: string;
  description: string;
}

const PAGE_TYPES = [
  { value: "area-guide", label: "Area Guide" },
  { value: "itinerary", label: "Itinerary" },
  { value: "topic", label: "Topic Page" },
  { value: "attraction", label: "Attraction" },
];

type TabId = "editor" | "paa" | "generation" | "facts" | "pages" | "viator";

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
  const [activeTab, setActiveTab] = useState<TabId>("editor");
  const [showAddPageModal, setShowAddPageModal] = useState(false);

  // PAA Research state
  const [paaQuestions, setPaaQuestions] = useState<PAAQuestion[]>([]);
  const [researching, setResearching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [expanding, setExpanding] = useState(false);

  // Editor state
  const [editorContent, setEditorContent] = useState("");
  const [previewVersion, setPreviewVersion] = useState<ContentVersion | null>(null);

  // Load hub data
  useEffect(() => {
    fetch(`/api/content?city=${citySlug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        const hubData = data.hub as CityHub;

        // Initialize versions array if not present (migration)
        if (!hubData.versions) {
          hubData.versions = [];
          if (hubData.generatedContent) {
            const initialVersion: ContentVersion = {
              id: `v_migrated_${Date.now()}`,
              content: hubData.generatedContent,
              wordCount: hubData.generatedContent.split(/\s+/).filter((w) => w).length,
              createdAt: hubData.updatedAt || new Date().toISOString(),
              source: "ai",
            };
            hubData.versions = [initialVersion];
            hubData.currentVersionId = initialVersion.id;
          }
        }

        setHub(hubData);
        setPages(data.pages || []);

        // Load PAA questions from hub
        if (hubData.paaResearch?.questions) {
          setPaaQuestions(hubData.paaResearch.questions);
        }

        // Set editor content from draft or current version
        if (hubData.draft?.content) {
          setEditorContent(hubData.draft.content);
        } else if (hubData.currentVersionId) {
          const currentVersion = hubData.versions.find((v) => v.id === hubData.currentVersionId);
          if (currentVersion) {
            setEditorContent(currentVersion.content);
          }
        } else if (hubData.generatedContent) {
          setEditorContent(hubData.generatedContent);
        }
      })
      .catch((err) => setError(err.message))
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
        body: JSON.stringify({ slug: citySlug, action: "update", updates: hub }),
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
      if (!hub) return;

      try {
        await fetch("/api/content", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: citySlug,
            action: "saveDraft",
            updates: { content },
          }),
        });
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    },
    [hub, citySlug]
  );

  const handlePublishVersion = async (note?: string) => {
    if (!hub || !editorContent) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: citySlug,
          action: "publishVersion",
          updates: { content: editorContent, source: "manual" },
          versionNote: note,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setHub(data.hub);
      setSuccess("Version published!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setSaving(false);
    }
  };

  const handleRevertToVersion = async (versionId: string) => {
    if (!hub) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: citySlug,
          action: "revertToVersion",
          versionId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setHub(data.hub);
      const revertedVersion = data.hub.versions.find((v: ContentVersion) => v.id === data.hub.currentVersionId);
      if (revertedVersion) {
        setEditorContent(revertedVersion.content);
      }
      setPreviewVersion(null);
      setSuccess("Reverted to version!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revert failed");
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewVersion = (version: ContentVersion) => {
    setPreviewVersion(version);
    setEditorContent(version.content);
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

      setPaaQuestions(data.questions);
      setSuccess("Research complete!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research failed");
    } finally {
      setResearching(false);
    }
  };

  const handleSavePAAQuestions = async (questions: PAAQuestion[]) => {
    if (!hub) return;

    try {
      const res = await fetch("/api/content/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          citySlug,
          action: "save",
          questions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setHub(data.hub);
      setSuccess("Research saved!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  };

  const handleToggleQuestion = (id: string) => {
    setPaaQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, selected: !q.selected } : q))
    );
  };

  const handleSelectAllQuestions = () => {
    setPaaQuestions((prev) => prev.map((q) => ({ ...q, selected: true })));
  };

  const handleClearAllQuestions = () => {
    setPaaQuestions((prev) => prev.map((q) => ({ ...q, selected: false })));
  };

  const handleGenerateContent = async (config: { tone: string; wordCount: number; keywords: string[] }) => {
    if (!hub) return;
    setGenerating(true);
    setError(null);

    const selectedQuestions = paaQuestions.filter((q) => q.selected);
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
          tone: config.tone,
          wordCount: config.wordCount,
          keywords: config.keywords,
          facts: hub.facts || [],  // Pass current facts to prompt
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Set the generated content in editor
      setEditorContent(data.content);

      // Auto-publish as a new version
      const publishRes = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: citySlug,
          action: "publishVersion",
          updates: {
            content: data.content,
            source: "ai",
            generationConfig: data.generationConfig,
          },
        }),
      });

      const publishData = await publishRes.json();
      if (publishRes.ok) {
        setHub(publishData.hub);
      }

      setSuccess(`Generated ${data.wordCount} words of SEO content!`);
      setTimeout(() => setSuccess(null), 5000);

      // Switch to editor tab
      setActiveTab("editor");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleExpandContent = async (config: { expandDirection: string; tone: string; wordCount: number; keywords: string[] }) => {
    if (!hub) return;
    setExpanding(true);
    setError(null);

    try {
      const res = await fetch("/api/content/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cityName: hub.name,
          action: "expand",
          existingContent: editorContent,
          expandDirection: config.expandDirection,
          tone: config.tone,
          wordCount: config.wordCount,
          keywords: config.keywords,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Set the expanded content in editor
      setEditorContent(data.content);

      // Auto-publish as a new version
      const publishRes = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: citySlug,
          action: "publishVersion",
          updates: {
            content: data.content,
            source: "ai",
            generationConfig: data.generationConfig,
          },
          versionNote: `Expanded: ${config.expandDirection.substring(0, 80)}`,
        }),
      });

      const publishData = await publishRes.json();
      if (publishRes.ok) {
        setHub(publishData.hub);
      }

      setSuccess(`Expanded to ${data.wordCount} words!`);
      setTimeout(() => setSuccess(null), 5000);

      // Switch to editor tab
      setActiveTab("editor");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Expansion failed");
    } finally {
      setExpanding(false);
    }
  };

  const handleSaveGenerationDefaults = async (config: { tone: string; wordCount: number; keywords: string[] }) => {
    if (!hub) return;

    try {
      await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: citySlug,
          action: "update",
          updates: { generationDefaults: config },
        }),
      });
    } catch (err) {
      console.error("Failed to save defaults:", err);
    }
  };

  const handleDeletePage = async (pageSlug: string) => {
    if (!confirm("Delete this page?")) return;

    try {
      const res = await fetch(`/api/content/pages?city=${citySlug}&page=${pageSlug}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setPages(pages.filter((p) => p.slug !== pageSlug));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const getWordCount = () => {
    return editorContent?.split(/\s+/).filter((w) => w).length || 0;
  };

  const selectedQuestionCount = paaQuestions.filter((q) => q.selected).length;

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
          <Link href="/content" className="text-[var(--primary)]">
            Back to Content
          </Link>
        </div>
      </div>
    );
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "editor", label: "Content Editor" },
    { id: "paa", label: "PAA Research" },
    { id: "generation", label: "Generation" },
    { id: "facts", label: "Facts" },
    { id: "pages", label: "Sub-Pages" },
    { id: "viator", label: "Viator" },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="bg-[var(--background-card)] border-b border-[var(--border)] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-10 h-10 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center font-bold hover:bg-[var(--primary-light)] transition-colors"
            >
              IE
            </Link>
            <div>
              <h1 className="font-semibold text-[var(--foreground)]">{hub.name} Hub</h1>
              <p className="text-sm text-[var(--foreground-muted)]">
                {pages.length} sub-pages - {getWordCount()} words
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === "editor" && (
              <button
                onClick={() => handlePublishVersion()}
                disabled={saving || !editorContent}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Publish Version
              </button>
            )}
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

      <main className="max-w-7xl mx-auto px-6 py-8">
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
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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

        {/* Content Editor Tab */}
        {activeTab === "editor" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 space-y-6">
              {/* Meta Info */}
              <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] p-6">
                <h3 className="font-semibold text-[var(--foreground)] mb-4">Page Meta</h3>
                <div className="grid gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                      Page Title (H1)
                    </label>
                    <input
                      type="text"
                      value={hub.title}
                      onChange={(e) => setHub({ ...hub, title: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
                      placeholder="e.g., Delhi Travel Guide: Everything You Need to Know 2024"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                      Meta Description
                    </label>
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

              {/* Preview indicator */}
              {previewVersion && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 flex items-center justify-between">
                  <div className="text-yellow-700 dark:text-yellow-400 text-sm">
                    Previewing version from{" "}
                    {new Date(previewVersion.createdAt).toLocaleDateString()}
                  </div>
                  <button
                    onClick={() => {
                      setPreviewVersion(null);
                      const currentVersion = hub.versions.find(
                        (v) => v.id === hub.currentVersionId
                      );
                      if (currentVersion) {
                        setEditorContent(currentVersion.content);
                      }
                    }}
                    className="text-yellow-700 dark:text-yellow-400 hover:underline text-sm font-medium"
                  >
                    Exit Preview
                  </button>
                </div>
              )}

              {/* Markdown Editor */}
              <MarkdownEditor
                value={editorContent}
                onChange={setEditorContent}
                onAutoSave={handleAutoSave}
                placeholder="Write your hub content in markdown..."
              />
            </div>

            {/* Version History Sidebar */}
            <div className="lg:col-span-1">
              <VersionHistory
                versions={hub.versions}
                currentVersionId={hub.currentVersionId}
                onPreview={handlePreviewVersion}
                onRevert={handleRevertToVersion}
                isLoading={saving}
              />
            </div>
          </div>
        )}

        {/* PAA Research Tab */}
        {activeTab === "paa" && (
          <PAAResearchPanel
            questions={paaQuestions}
            lastResearchedAt={hub.paaResearch?.lastResearchedAt}
            onResearch={handleResearchPAA}
            onToggleQuestion={handleToggleQuestion}
            onSelectAll={handleSelectAllQuestions}
            onClearAll={handleClearAllQuestions}
            onSaveQuestions={handleSavePAAQuestions}
            isResearching={researching}
            cityName={hub.name}
          />
        )}

        {/* Generation Tab */}
        {activeTab === "generation" && (
          <div className="max-w-2xl">
            <GenerationControls
              defaults={hub.generationDefaults}
              selectedQuestionCount={selectedQuestionCount}
              onGenerate={handleGenerateContent}
              onSaveDefaults={handleSaveGenerationDefaults}
              isGenerating={generating}
              cityName={hub.name}
              selectedQuestions={paaQuestions.filter((q) => q.selected)}
              existingContent={editorContent}
              onExpand={handleExpandContent}
              isExpanding={expanding}
            />

            {selectedQuestionCount === 0 && paaQuestions.length === 0 && (
              <div className="mt-6 p-4 bg-[var(--background-card)] rounded-xl border border-[var(--border)] text-center">
                <p className="text-[var(--foreground-muted)] mb-3">
                  No PAA questions available. Research questions first.
                </p>
                <button
                  onClick={() => setActiveTab("paa")}
                  className="text-[var(--primary)] font-medium hover:underline"
                >
                  Go to PAA Research
                </button>
              </div>
            )}
          </div>
        )}

        {/* Facts Tab */}
        {activeTab === "facts" && (
          <div className="max-w-2xl">
            <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-[var(--foreground)]">Current Facts</h3>
                  <p className="text-sm text-[var(--foreground-muted)] mt-1">
                    These facts are injected into AI prompts to ensure accurate, up-to-date content generation.
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {(hub.facts || []).map((fact, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-[var(--background)] rounded-xl border border-[var(--border)]"
                  >
                    <div className="flex-1">
                      <textarea
                        value={fact}
                        onChange={(e) => {
                          const newFacts = [...(hub.facts || [])];
                          newFacts[index] = e.target.value;
                          setHub({ ...hub, facts: newFacts });
                        }}
                        rows={2}
                        className="w-full px-3 py-2 bg-transparent border-0 text-[var(--foreground)] text-sm resize-none focus:outline-none focus:ring-0"
                        placeholder="Enter a fact..."
                      />
                    </div>
                    <button
                      onClick={() => {
                        const newFacts = (hub.facts || []).filter((_, i) => i !== index);
                        setHub({ ...hub, facts: newFacts });
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}

                {(!hub.facts || hub.facts.length === 0) && (
                  <div className="text-center py-8 text-[var(--foreground-muted)]">
                    No facts added yet. Add facts to ensure AI generates accurate content.
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  const newFacts = [...(hub.facts || []), ""];
                  setHub({ ...hub, facts: newFacts });
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Fact
              </button>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2">Tips for good facts:</h4>
                <ul className="text-sm text-blue-600 dark:text-blue-300 space-y-1">
                  <li>• Include new infrastructure (airports, metro lines, roads)</li>
                  <li>• Add current prices with year (taxi rates 2026: ₹X)</li>
                  <li>• Note policy changes (visa rules, entry requirements)</li>
                  <li>• Mention seasonal events with dates</li>
                  <li>• Keep each fact specific and concise</li>
                </ul>
              </div>
            </div>
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
                  {pages.map((page) => (
                    <div
                      key={page.slug}
                      className="p-4 flex items-center justify-between hover:bg-[var(--primary)]/5 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 bg-[var(--primary)]/10 text-[var(--primary)] rounded font-medium">
                            {page.type}
                          </span>
                        </div>
                        <h4 className="font-medium text-[var(--foreground)]">{page.title}</h4>
                        <p className="text-sm text-[var(--foreground-muted)]">
                          /{citySlug}/{page.slug}
                        </p>
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
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
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
          <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] p-6 max-w-2xl">
            <h3 className="font-semibold text-[var(--foreground)] mb-4">Viator Integration</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="viator-enabled"
                  checked={hub.viator.enabled}
                  onChange={(e) =>
                    setHub({ ...hub, viator: { ...hub.viator, enabled: e.target.checked } })
                  }
                  className="w-5 h-5 rounded border-[var(--border)] text-[var(--primary)]"
                />
                <label htmlFor="viator-enabled" className="text-[var(--foreground)]">
                  Enable Viator tours on this hub
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Destination ID
                </label>
                <input
                  type="number"
                  value={hub.viator.destinationId}
                  onChange={(e) =>
                    setHub({
                      ...hub,
                      viator: { ...hub.viator, destinationId: parseInt(e.target.value) || 0 },
                    })
                  }
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
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    );
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
    <Modal isOpen={true} onClose={onClose} title="Add Sub-Page">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
            Page Title
          </label>
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
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
            URL Slug
          </label>
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
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
            Page Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
          >
            {PAGE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)] rounded-xl transition-colors font-medium"
          >
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
    </Modal>
  );
}
