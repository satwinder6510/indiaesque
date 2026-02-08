"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { use } from "react";
import type { ContentBank, ContentBankPage, PageStatus } from "@/lib/types";

type TabType = "bank" | "research" | "generate" | "validate" | "files";

const STATUS_CONFIG: Record<PageStatus, { bg: string; text: string }> = {
  "not-started": { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-400" },
  generating: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300" },
  generated: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300" },
  "validation-failed": { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300" },
  validated: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300" },
  published: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300" },
};

const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
  {
    id: "bank",
    label: "Content Bank",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
  },
  {
    id: "research",
    label: "Research",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  },
  {
    id: "generate",
    label: "Generate",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  },
  {
    id: "validate",
    label: "Validate",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  {
    id: "files",
    label: "Files",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
  },
];

export default function CityPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const { slug } = resolvedParams;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [contentBank, setContentBank] = useState<ContentBank | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>((searchParams.get("tab") as TabType) || "bank");

  const fetchContentBank = useCallback(async () => {
    try {
      const response = await fetch(`/api/content-bank/${slug}`);
      if (response.status === 404) {
        setContentBank(null);
        return;
      }
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setContentBank(data);
      setError("");
    } catch {
      setError("Failed to load content bank");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchContentBank();
  }, [fetchContentBank]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    router.push(`/city/${slug}?tab=${tab}`, { scroll: false });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--foreground-muted)]">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </div>
      </div>
    );
  }

  const cityName = contentBank?.cityName || slug.charAt(0).toUpperCase() + slug.slice(1);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-[var(--primary)] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <button
              onClick={() => router.push("/")}
              className="p-2 -ml-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{cityName}</h1>
              <p className="text-white/60 text-sm">Content Management</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-[var(--background-card)] border-b border-[var(--border)] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 -mb-px">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 py-4 px-4 border-b-2 font-medium text-sm transition-all duration-200 ${
                  activeTab === tab.id
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--border)]"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl">
            {error}
          </div>
        )}

        {activeTab === "bank" && (
          <ContentBankTab contentBank={contentBank} citySlug={slug} cityName={cityName} onRefresh={fetchContentBank} />
        )}
        {activeTab === "research" && (
          <ResearchTab citySlug={slug} cityName={cityName} onRefresh={fetchContentBank} />
        )}
        {activeTab === "generate" && (
          <GenerateTab contentBank={contentBank} citySlug={slug} onRefresh={fetchContentBank} />
        )}
        {activeTab === "validate" && (
          <ValidateTab contentBank={contentBank} citySlug={slug} />
        )}
        {activeTab === "files" && <FilesTab citySlug={slug} />}
      </main>
    </div>
  );
}

function ContentBankTab({
  contentBank,
  citySlug,
  cityName,
  onRefresh,
}: {
  contentBank: ContentBank | null;
  citySlug: string;
  cityName: string;
  onRefresh: () => void;
}) {
  const [filter, setFilter] = useState({ type: "", category: "", status: "" });
  const [showAddPage, setShowAddPage] = useState(false);

  if (!contentBank) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No content bank yet</h3>
        <p className="text-[var(--foreground-muted)] mb-6 max-w-md mx-auto">
          Run research to discover PAA questions and create a content bank for {cityName}.
        </p>
      </div>
    );
  }

  const filteredPages = contentBank.pages.filter((page) => {
    if (filter.type && page.type !== filter.type) return false;
    if (filter.category && page.category !== filter.category) return false;
    if (filter.status && page.status !== filter.status) return false;
    return true;
  });

  const categories = [...new Set(contentBank.pages.map((p) => p.category))];
  const types = [...new Set(contentBank.pages.map((p) => p.type))];
  const statuses = [...new Set(contentBank.pages.map((p) => p.status))];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MiniStatCard label="Total" value={contentBank.pages.length} />
        <MiniStatCard label="Hub" value={contentBank.pages.filter((p) => p.type === "hub").length} />
        <MiniStatCard label="Category" value={contentBank.pages.filter((p) => p.type === "category").length} />
        <MiniStatCard label="PAA" value={contentBank.pages.filter((p) => p.type === "paa").length} />
        <MiniStatCard label="Generated" value={contentBank.pages.filter((p) => p.status !== "not-started").length} accent />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2">
          <select
            value={filter.type}
            onChange={(e) => setFilter({ ...filter, type: e.target.value })}
            className="px-3 py-2 bg-[var(--background-card)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="">All Types</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={filter.category}
            onChange={(e) => setFilter({ ...filter, category: e.target.value })}
            className="px-3 py-2 bg-[var(--background-card)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="px-3 py-2 bg-[var(--background-card)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button
          onClick={() => setShowAddPage(true)}
          className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white text-sm font-semibold rounded-xl shadow-lg transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Page
        </button>
      </div>

      {/* Pages table */}
      <div className="bg-[var(--background-card)] rounded-2xl shadow-lg border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--background)] border-b border-[var(--border)]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--foreground-muted)] uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--foreground-muted)] uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--foreground-muted)] uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--foreground-muted)] uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--foreground-muted)] uppercase">Slug</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--foreground-muted)] uppercase">Words</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredPages.map((page, i) => (
                <PageRow key={page.id} page={page} citySlug={citySlug} onUpdate={onRefresh} isEven={i % 2 === 0} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddPage && (
        <AddPageModal citySlug={citySlug} categories={categories} onClose={() => setShowAddPage(false)} onSuccess={() => { setShowAddPage(false); onRefresh(); }} />
      )}
    </div>
  );
}

function MiniStatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`bg-[var(--background-card)] rounded-xl border border-[var(--border)] p-4 ${accent ? "ring-2 ring-[var(--accent)]/20" : ""}`}>
      <div className={`text-2xl font-bold ${accent ? "text-[var(--accent)]" : "text-[var(--foreground)]"}`}>{value}</div>
      <div className="text-xs text-[var(--foreground-muted)] mt-0.5">{label}</div>
    </div>
  );
}

function PageRow({ page, citySlug, onUpdate, isEven }: { page: ContentBankPage; citySlug: string; onUpdate: () => void; isEven: boolean }) {
  const [editing, setEditing] = useState<"title" | null>(null);
  const [editValue, setEditValue] = useState("");
  const config = STATUS_CONFIG[page.status];

  const handleSave = async () => {
    try {
      await fetch(`/api/content-bank/${citySlug}/page`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: page.id, updates: { title: editValue } }),
      });
      setEditing(null);
      onUpdate();
    } catch {
      console.error("Failed to update");
    }
  };

  return (
    <tr className={`hover:bg-[var(--primary)]/5 transition-colors ${isEven ? "bg-[var(--background)]/30" : ""}`}>
      <td className="px-4 py-3">
        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
          {page.status}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-[var(--foreground-muted)]">{page.type}</td>
      <td className="px-4 py-3 text-sm text-[var(--foreground-muted)]">{page.category}</td>
      <td className="px-4 py-3">
        {editing === "title" ? (
          <div className="flex gap-2">
            <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="flex-1 px-2 py-1 text-sm border border-[var(--border)] rounded-lg bg-[var(--background)]" autoFocus />
            <button onClick={handleSave} className="px-2 py-1 bg-[var(--primary)] text-white rounded text-xs">Save</button>
            <button onClick={() => setEditing(null)} className="px-2 py-1 text-[var(--foreground-muted)] text-xs">Cancel</button>
          </div>
        ) : (
          <button onClick={() => { setEditing("title"); setEditValue(page.title); }} className="text-left text-sm text-[var(--foreground)] hover:text-[var(--primary)]">
            {page.title}
          </button>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-[var(--foreground-muted)] font-mono">{page.slug}</td>
      <td className="px-4 py-3 text-right text-sm text-[var(--foreground-muted)] tabular-nums">{page.wordCount || "—"}</td>
    </tr>
  );
}

function AddPageModal({ citySlug, categories, onClose, onSuccess }: { citySlug: string; categories: string[]; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({ title: "", slug: "", type: "paa" as const, category: categories[0] || "general", contentDirection: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`/api/content-bank/${citySlug}/page`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, slug: formData.slug || formData.title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-") }),
      });
      onSuccess();
    } catch {
      console.error("Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--background-card)] rounded-2xl shadow-2xl w-full max-w-lg border border-[var(--border)]">
        <div className="px-6 py-5 border-b border-[var(--border)] flex justify-between items-center">
          <h3 className="text-lg font-semibold">Add New Page</h3>
          <button onClick={onClose} className="p-1 hover:bg-[var(--border)] rounded-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Title *</label>
            <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Type</label>
              <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as "paa" })} className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl">
                <option value="paa">PAA</option>
                <option value="category">Category</option>
                <option value="hub">Hub</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Category</label>
              <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl">
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="general">general</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Content Direction</label>
            <textarea value={formData.contentDirection} onChange={(e) => setFormData({ ...formData, contentDirection: e.target.value })} className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl" rows={3} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 hover:bg-[var(--border)] rounded-xl">Cancel</button>
            <button type="submit" disabled={loading} className="px-5 py-2.5 bg-[var(--primary)] text-white font-semibold rounded-xl">{loading ? "Adding..." : "Add Page"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResearchTab({ citySlug, cityName, onRefresh }: { citySlug: string; cityName: string; onRefresh: () => void }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleResearch = async () => {
    setRunning(true);
    setResult(null);
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: citySlug, cityName, seedQueries: [`things to do in ${cityName}`, `${cityName} travel guide`, `is ${cityName} safe`, `best food in ${cityName}`] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult(`Research complete! Discovered ${data.totalPages} pages.`);
      onRefresh();
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : "Failed"}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="bg-[var(--background-card)] rounded-2xl shadow-lg border border-[var(--border)] p-8">
        <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2">PAA Research</h2>
        <p className="text-[var(--foreground-muted)] mb-6">
          Discover traveller questions about {cityName} using AI-powered web search. This creates a content bank with 80-120 PAA questions.
        </p>
        <button onClick={handleResearch} disabled={running} className="px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-light)] disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg transition-all flex items-center gap-2">
          {running ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Researching...
            </>
          ) : "Run Research"}
        </button>
        {result && (
          <div className={`mt-6 p-4 rounded-xl ${result.startsWith("Error") ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400" : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"}`}>
            {result}
          </div>
        )}
      </div>
    </div>
  );
}

function GenerateTab({ contentBank, citySlug, onRefresh }: { contentBank: ContentBank | null; citySlug: string; onRefresh: () => void }) {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [log, setLog] = useState<{ text: string; type: "info" | "success" | "error" }[]>([]);

  if (!contentBank) {
    return <div className="text-center py-12 text-[var(--foreground-muted)]">No content bank available. Run research first.</div>;
  }

  const pendingPages = contentBank.pages.filter((p) => p.status === "not-started");

  const handleGenerate = async () => {
    setGenerating(true);
    setLog([]);
    const ordered = [...pendingPages.filter((p) => p.type === "hub"), ...pendingPages.filter((p) => p.type === "category"), ...pendingPages.filter((p) => p.type === "paa")];
    setProgress({ current: 0, total: ordered.length });

    for (let i = 0; i < ordered.length; i++) {
      const page = ordered[i];
      setProgress({ current: i + 1, total: ordered.length });
      setLog((prev) => [...prev, { text: `Generating: ${page.title}...`, type: "info" }]);

      try {
        const response = await fetch("/api/generate-page", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ city: citySlug, pageId: page.id }) });
        const result = await response.json();
        if (result.status === "success") {
          setLog((prev) => [...prev.slice(0, -1), { text: `${page.title} (${result.wordCount} words)`, type: "success" }]);
        } else {
          setLog((prev) => [...prev.slice(0, -1), { text: `${page.title}: ${result.error}`, type: "error" }]);
        }
      } catch {
        setLog((prev) => [...prev.slice(0, -1), { text: `${page.title}: Failed`, type: "error" }]);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    setGenerating(false);
    setLog((prev) => [...prev, { text: "Generation complete!", type: "success" }]);
    onRefresh();
  };

  const progressPercent = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-[var(--background-card)] rounded-2xl shadow-lg border border-[var(--border)] p-6">
        <h2 className="text-lg font-semibold mb-4">Content Generation</h2>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <MiniStatCard label="Pending" value={pendingPages.length} />
          <MiniStatCard label="Generated" value={contentBank.pages.filter((p) => p.status !== "not-started").length} accent />
          <MiniStatCard label="Total" value={contentBank.pages.length} />
        </div>

        <button onClick={handleGenerate} disabled={generating || pendingPages.length === 0} className="px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-light)] disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg transition-all flex items-center gap-2">
          {generating ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Generating {progress.current}/{progress.total}...
            </>
          ) : `Generate All (${pendingPages.length} pages)`}
        </button>

        {generating && (
          <div className="mt-4">
            <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--accent)] transition-all duration-300 progress-animated" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="text-sm text-[var(--foreground-muted)] mt-2">{progress.current} of {progress.total} pages</p>
          </div>
        )}

        {log.length > 0 && (
          <div className="mt-6 terminal-log rounded-xl p-4 max-h-64 overflow-y-auto">
            {log.map((entry, i) => (
              <div key={i} className={entry.type}>
                {entry.type === "success" && "✓ "}
                {entry.type === "error" && "✗ "}
                {entry.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ValidateTab({ contentBank, citySlug }: { contentBank: ContentBank | null; citySlug: string }) {
  const [validating, setValidating] = useState(false);
  const [results, setResults] = useState<{ passed: number; failed: number; errors: { file: string; errors: { type: string }[] }[] } | null>(null);

  if (!contentBank) return <div className="text-center py-12 text-[var(--foreground-muted)]">No content bank available.</div>;

  const handleValidate = async () => {
    setValidating(true);
    try {
      const response = await fetch("/api/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ city: citySlug, pageIds: ["all"] }) });
      setResults(await response.json());
    } catch {
      console.error("Validation failed");
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-[var(--background-card)] rounded-2xl shadow-lg border border-[var(--border)] p-6">
        <h2 className="text-lg font-semibold mb-4">Content Validation</h2>
        <button onClick={handleValidate} disabled={validating} className="px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-light)] disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg transition-all">
          {validating ? "Validating..." : "Run Validation"}
        </button>

        {results && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <div className="text-2xl font-bold text-emerald-600">{results.passed}</div>
                <div className="text-sm text-emerald-600">Passed</div>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                <div className="text-sm text-red-600">Failed</div>
              </div>
            </div>
            {results.errors.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium">Errors</h3>
                {results.errors.slice(0, 10).map((err, i) => (
                  <div key={i} className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg text-sm">
                    <div className="font-medium text-red-800 dark:text-red-300">{err.file}</div>
                    <ul className="text-red-600 dark:text-red-400">{err.errors.map((e, j) => <li key={j}>{e.type}</li>)}</ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FilesTab({ citySlug }: { citySlug: string }) {
  const [files, setFiles] = useState<{ name: string; path: string; size: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/files/${citySlug}`).then((r) => r.json()).then((d) => setFiles(d.files || [])).finally(() => setLoading(false));
  }, [citySlug]);

  if (loading) return <div className="text-center py-12 text-[var(--foreground-muted)]">Loading files...</div>;

  return (
    <div className="bg-[var(--background-card)] rounded-2xl shadow-lg border border-[var(--border)] overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--border)]">
        <h2 className="font-semibold">Generated Files</h2>
        <p className="text-sm text-[var(--foreground-muted)]">src/content/{citySlug}/</p>
      </div>
      {files.length === 0 ? (
        <div className="p-8 text-center text-[var(--foreground-muted)]">No files generated yet.</div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {files.map((file) => (
            <div key={file.path} className="px-6 py-3 flex justify-between items-center hover:bg-[var(--primary)]/5">
              <span className="font-mono text-sm">{file.name}</span>
              <span className="text-sm text-[var(--foreground-muted)]">{(file.size / 1024).toFixed(1)} KB</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
