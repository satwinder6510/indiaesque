"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CityHub {
  slug: string;
  name: string;
  pageCount: number;
}

interface CityStatus {
  slug: string;
  name: string;
  contentBank: boolean;
  generated: number;
  total: number;
}

interface Page {
  id: string;
  title: string;
  slug: string;
  status: string;
  tier: string;
  category: string;
}

interface ContentBank {
  pages: Page[];
}

interface BulkResearchResult {
  citySlug: string;
  cityName: string;
  success: boolean;
  error?: string;
  questionCount?: number;
}

interface AIScoreSummary {
  average: number;
  distribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
    bad: number;
    fail: number;
  };
  readyToPublish: number;
  needsEditing: number;
}

interface FileAIScore {
  total: number;
  rating: string;
  breakdown: {
    phrases: number;
    structural: number;
  };
  phraseViolations: number;
  structuralViolations: number;
}

interface ValidationResult {
  totalFiles: number;
  passed: number;
  failed: number;
  aiScores: Record<string, FileAIScore>;
  aiScoreSummary: AIScoreSummary;
  errors: Array<{
    file: string;
    type: string;
    category?: string;
    weight?: number;
    line?: number;
    message: string;
  }>;
}

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState<"hubs" | "pages" | "ai">("hubs");
  const router = useRouter();

  // Hub state
  const [cities, setCities] = useState<CityHub[]>([]);
  const [loadingHubs, setLoadingHubs] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkResearchModal, setShowBulkResearchModal] = useState(false);

  // Pages state
  const [cityStatuses, setCityStatuses] = useState<CityStatus[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [contentBank, setContentBank] = useState<ContentBank | null>(null);
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [loadingPages, setLoadingPages] = useState(true);

  // AI Detection state
  const [aiSelectedCity, setAiSelectedCity] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Load hubs data
  useEffect(() => {
    fetch("/api/content")
      .then((r) => r.json())
      .then((data) => setCities(data.cities || []))
      .catch(console.error)
      .finally(() => setLoadingHubs(false));
  }, []);

  // Load pages status
  useEffect(() => {
    fetch("/api/seo/status")
      .then((res) => res.json())
      .then((data) => {
        setCityStatuses(data.cities || []);
        setLoadingPages(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadingPages(false);
      });
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const loadContentBank = async (citySlug: string) => {
    setSelectedCity(citySlug);
    const res = await fetch(`/api/seo/content-bank/${citySlug}`);
    const data = await res.json();
    setContentBank(data);
    setSelectedPages(new Set());
  };

  const togglePage = (pageId: string) => {
    const newSet = new Set(selectedPages);
    if (newSet.has(pageId)) {
      newSet.delete(pageId);
    } else {
      newSet.add(pageId);
    }
    setSelectedPages(newSet);
  };

  const selectAllPending = () => {
    if (!contentBank) return;
    const pending = contentBank.pages.filter((p) => p.status !== "generated");
    setSelectedPages(new Set(pending.map((p) => p.id)));
  };

  const generateSelected = async () => {
    if (!selectedCity || selectedPages.size === 0) return;
    setGenerating(true);
    setLog(["Starting generation..."]);

    for (const pageId of selectedPages) {
      const page = contentBank?.pages.find((p) => p.id === pageId);
      setLog((prev) => [...prev, `Generating: ${page?.title || pageId}...`]);

      try {
        const res = await fetch("/api/seo/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ city: selectedCity, pageId }),
        });
        const result = await res.json();
        if (result.success) {
          setLog((prev) => [...prev, `  Generated: ${page?.title}`]);
        } else {
          setLog((prev) => [...prev, `  Failed: ${page?.title} - ${result.error}`]);
        }
      } catch {
        setLog((prev) => [...prev, `  Error: ${page?.title}`]);
      }
    }

    setLog((prev) => [...prev, "Done!"]);
    setGenerating(false);
    loadContentBank(selectedCity);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "generated":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const runValidation = async (city: string) => {
    setAiSelectedCity(city);
    setValidating(true);
    setValidationResult(null);
    setSelectedFile(null);

    try {
      const res = await fetch("/api/seo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setValidationResult(data.data);
      }
    } catch (err) {
      console.error("Validation failed:", err);
    } finally {
      setValidating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score <= 10) return "text-green-600 dark:text-green-400";
    if (score <= 20) return "text-green-500 dark:text-green-500";
    if (score <= 35) return "text-yellow-600 dark:text-yellow-400";
    if (score <= 50) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBadge = (score: number) => {
    if (score <= 10) return { label: "Excellent", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" };
    if (score <= 20) return { label: "Good", color: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-500" };
    if (score <= 35) return { label: "Fair", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" };
    if (score <= 50) return { label: "Poor", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" };
    return { label: "Bad", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" };
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="bg-[var(--background-card)] border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-10 h-10 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center font-bold hover:bg-[var(--primary-light)] transition-colors"
            >
              IE
            </Link>
            <div>
              <h1 className="font-semibold text-[var(--foreground)]">Content</h1>
              <p className="text-sm text-[var(--foreground-muted)]">City hubs & pages</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("hubs")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "hubs"
                ? "bg-[var(--primary)] text-white"
                : "bg-[var(--background-card)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border)]"
            }`}
          >
            City Hubs
          </button>
          <button
            onClick={() => setActiveTab("pages")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "pages"
                ? "bg-[var(--primary)] text-white"
                : "bg-[var(--background-card)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border)]"
            }`}
          >
            Pages
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "ai"
                ? "bg-[var(--primary)] text-white"
                : "bg-[var(--background-card)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border)]"
            }`}
          >
            AI Detection
          </button>
        </div>

        {/* City Hubs Tab */}
        {activeTab === "hubs" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[var(--foreground)]">City Hubs</h2>
                <p className="text-[var(--foreground-muted)] mt-1">Manage city landing pages</p>
              </div>
              <div className="flex items-center gap-3">
                {cities.length > 0 && (
                  <button
                    onClick={() => setShowBulkResearchModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white font-medium rounded-xl shadow-lg transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    Bulk Research
                  </button>
                )}
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white font-medium rounded-xl shadow-lg transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add City Hub
                </button>
              </div>
            </div>

            {loadingHubs ? (
              <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] p-8 text-center text-[var(--foreground-muted)]">
                Loading...
              </div>
            ) : cities.length === 0 ? (
              <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] p-12 text-center">
                <svg
                  className="w-12 h-12 mx-auto mb-4 text-[var(--foreground-muted)] opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No city hubs yet</h3>
                <p className="text-[var(--foreground-muted)] mb-4">Create your first city hub to get started.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {cities.map((city) => (
                  <Link
                    key={city.slug}
                    href={`/content/${city.slug}`}
                    className="block bg-[var(--background-card)] rounded-2xl p-6 border border-[var(--border)] hover:border-[var(--primary)] hover:shadow-lg transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-[var(--foreground)] mb-1">{city.name}</h3>
                        <p className="text-[var(--foreground-muted)] text-sm">
                          {city.pageCount} sub-page{city.pageCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--primary)] font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                          Edit Hub
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* Pages Tab */}
        {activeTab === "pages" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[var(--foreground)]">Content Pages</h2>
                <p className="text-[var(--foreground-muted)] mt-1">Generate and manage article pages</p>
              </div>
            </div>

            {/* City Status Overview */}
            <div className="bg-[var(--background-card)] rounded-2xl p-6 border border-[var(--border)] mb-6">
              <h3 className="text-lg font-semibold mb-4">City Status</h3>
              {loadingPages ? (
                <p className="text-[var(--foreground-muted)]">Loading...</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {cityStatuses.map((city) => (
                    <button
                      key={city.slug}
                      onClick={() => loadContentBank(city.slug)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        selectedCity === city.slug
                          ? "border-[var(--primary)] bg-[var(--primary)]/5"
                          : "border-[var(--border)] hover:border-[var(--primary)]/50"
                      }`}
                    >
                      <div className="font-semibold capitalize">{city.name}</div>
                      <div className="text-sm text-[var(--foreground-muted)]">
                        {city.generated}/{city.total} pages
                      </div>
                      <div className="mt-2 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--primary)] rounded-full"
                          style={{ width: city.total ? `${(city.generated / city.total) * 100}%` : "0%" }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Content Bank for Selected City */}
            {selectedCity && contentBank && (
              <div className="bg-[var(--background-card)] rounded-2xl p-6 border border-[var(--border)] mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold capitalize">{selectedCity} Pages</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllPending}
                      className="px-3 py-1.5 text-sm bg-[var(--background)] rounded-lg border border-[var(--border)] hover:border-[var(--primary)] transition-colors"
                    >
                      Select Pending
                    </button>
                    <button
                      onClick={generateSelected}
                      disabled={generating || selectedPages.size === 0}
                      className="px-4 py-1.5 bg-[var(--primary)] text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
                    >
                      {generating ? "Generating..." : `Generate (${selectedPages.size})`}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="w-10 py-3 px-4"></th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[var(--foreground-muted)]">Title</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[var(--foreground-muted)]">Slug</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[var(--foreground-muted)]">Tier</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[var(--foreground-muted)]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contentBank.pages.map((page) => (
                        <tr key={page.id} className="border-b border-[var(--border)]">
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={selectedPages.has(page.id)}
                              onChange={() => togglePage(page.id)}
                              disabled={page.status === "generated"}
                              className="w-4 h-4 rounded"
                            />
                          </td>
                          <td className="py-3 px-4 text-sm">{page.title}</td>
                          <td className="py-3 px-4 text-sm text-[var(--foreground-muted)] font-mono">{page.slug}</td>
                          <td className="py-3 px-4 text-sm">{page.tier}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(page.status)}`}>
                              {page.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Generation Log */}
            {log.length > 0 && (
              <div className="bg-[var(--background-card)] rounded-2xl p-6 border border-[var(--border)]">
                <h3 className="text-lg font-semibold mb-4">Generation Log</h3>
                <div className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg max-h-64 overflow-y-auto">
                  {log.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* AI Detection Tab */}
        {activeTab === "ai" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[var(--foreground)]">AI Detection</h2>
                <p className="text-[var(--foreground-muted)] mt-1">Scan content for AI-detectable patterns</p>
              </div>
            </div>

            {/* City Selector */}
            <div className="bg-[var(--background-card)] rounded-2xl p-6 border border-[var(--border)] mb-6">
              <h3 className="text-lg font-semibold mb-4">Select City to Validate</h3>
              <div className="flex flex-wrap gap-3">
                {cityStatuses.map((city) => (
                  <button
                    key={city.slug}
                    onClick={() => runValidation(city.slug)}
                    disabled={validating}
                    className={`px-4 py-2 rounded-lg font-medium capitalize transition-all ${
                      aiSelectedCity === city.slug
                        ? "bg-[var(--primary)] text-white"
                        : "bg-[var(--background)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border)] hover:border-[var(--primary)]"
                    } disabled:opacity-50`}
                  >
                    {validating && aiSelectedCity === city.slug ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Validating...
                      </span>
                    ) : (
                      city.name
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Validation Results */}
            {validationResult && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-[var(--background-card)] rounded-xl p-4 border border-[var(--border)]">
                    <div className="text-3xl font-bold text-[var(--foreground)]">{validationResult.totalFiles}</div>
                    <div className="text-sm text-[var(--foreground-muted)]">Total Files</div>
                  </div>
                  <div className="bg-[var(--background-card)] rounded-xl p-4 border border-green-200 dark:border-green-800">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {validationResult.aiScoreSummary.readyToPublish}
                    </div>
                    <div className="text-sm text-[var(--foreground-muted)]">Ready to Publish</div>
                  </div>
                  <div className="bg-[var(--background-card)] rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
                    <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                      {validationResult.aiScoreSummary.needsEditing}
                    </div>
                    <div className="text-sm text-[var(--foreground-muted)]">Needs Editing</div>
                  </div>
                  <div className="bg-[var(--background-card)] rounded-xl p-4 border border-[var(--border)]">
                    <div className="text-3xl font-bold text-[var(--foreground)]">
                      {validationResult.aiScoreSummary.average}
                    </div>
                    <div className="text-sm text-[var(--foreground-muted)]">Avg Score</div>
                  </div>
                </div>

                {/* Distribution Chart */}
                <div className="bg-[var(--background-card)] rounded-2xl p-6 border border-[var(--border)] mb-6">
                  <h3 className="text-lg font-semibold mb-4">Score Distribution</h3>
                  <div className="flex items-end gap-2 h-32">
                    {Object.entries(validationResult.aiScoreSummary.distribution).map(([rating, count]) => {
                      const maxCount = Math.max(...Object.values(validationResult.aiScoreSummary.distribution));
                      const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                      const colors: Record<string, string> = {
                        excellent: "bg-green-500",
                        good: "bg-green-400",
                        fair: "bg-yellow-500",
                        poor: "bg-orange-500",
                        bad: "bg-red-500",
                        fail: "bg-red-700",
                      };
                      return (
                        <div key={rating} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs font-medium text-[var(--foreground)]">{count}</span>
                          <div
                            className={`w-full rounded-t ${colors[rating]}`}
                            style={{ height: `${height}%`, minHeight: count > 0 ? "4px" : "0" }}
                          />
                          <span className="text-xs text-[var(--foreground-muted)] capitalize">{rating}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Flagged Files */}
                <div className="bg-[var(--background-card)] rounded-2xl p-6 border border-[var(--border)]">
                  <h3 className="text-lg font-semibold mb-4">
                    Files by Score
                    <span className="text-sm font-normal text-[var(--foreground-muted)] ml-2">
                      (click to see details)
                    </span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[var(--border)]">
                          <th className="text-left py-3 px-4 text-sm font-medium text-[var(--foreground-muted)]">File</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-[var(--foreground-muted)]">Score</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-[var(--foreground-muted)]">Rating</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-[var(--foreground-muted)]">Phrases</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-[var(--foreground-muted)]">Structural</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(validationResult.aiScores)
                          .sort(([, a], [, b]) => b.total - a.total)
                          .map(([file, score]) => {
                            const badge = getScoreBadge(score.total);
                            return (
                              <tr
                                key={file}
                                onClick={() => setSelectedFile(selectedFile === file ? null : file)}
                                className={`border-b border-[var(--border)] cursor-pointer transition-colors ${
                                  selectedFile === file
                                    ? "bg-[var(--primary)]/5"
                                    : "hover:bg-[var(--background)]"
                                }`}
                              >
                                <td className="py-3 px-4 text-sm font-mono">{file}</td>
                                <td className={`py-3 px-4 text-sm font-bold ${getScoreColor(score.total)}`}>
                                  {score.total}
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${badge.color}`}>
                                    {badge.label}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-sm text-[var(--foreground-muted)]">
                                  {score.phraseViolations > 0 ? score.phraseViolations : "-"}
                                </td>
                                <td className="py-3 px-4 text-sm text-[var(--foreground-muted)]">
                                  {score.structuralViolations > 0 ? score.structuralViolations : "-"}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* File Details */}
                {selectedFile && (
                  <div className="bg-[var(--background-card)] rounded-2xl p-6 border border-[var(--border)] mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold font-mono">{selectedFile}</h3>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="p-1 text-[var(--foreground-muted)] hover:text-[var(--foreground)] rounded-lg hover:bg-[var(--border)]"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="space-y-2">
                      {validationResult.errors
                        .filter((e) => e.file === selectedFile)
                        .map((error, i) => (
                          <div
                            key={i}
                            className={`p-3 rounded-lg text-sm ${
                              error.type === "banned-phrase"
                                ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                                : "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {error.weight && (
                                <span className="px-1.5 py-0.5 bg-[var(--background)] rounded text-xs font-medium">
                                  +{error.weight}
                                </span>
                              )}
                              <span className="text-[var(--foreground)]">{error.message}</span>
                            </div>
                          </div>
                        ))}
                      {validationResult.errors.filter((e) => e.file === selectedFile).length === 0 && (
                        <p className="text-[var(--foreground-muted)]">No issues found in this file.</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {showAddModal && (
        <AddHubModal
          onClose={() => setShowAddModal(false)}
          onSuccess={(hub) => {
            setCities((prev) => [...prev, { slug: hub.slug, name: hub.name, pageCount: 0 }]);
            setShowAddModal(false);
            router.push(`/content/${hub.slug}`);
          }}
        />
      )}

      {showBulkResearchModal && (
        <BulkResearchModal cities={cities} onClose={() => setShowBulkResearchModal(false)} />
      )}
    </div>
  );
}

function AddHubModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (hub: { slug: string; name: string }) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onSuccess(data.hub);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create hub");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--background-card)] rounded-2xl shadow-2xl w-full max-w-md border border-[var(--border)]">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Add City Hub</h3>
          <button
            onClick={onClose}
            className="p-1 text-[var(--foreground-muted)] hover:text-[var(--foreground)] rounded-lg hover:bg-[var(--border)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">City Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-[var(--foreground)]"
              placeholder="e.g., Delhi"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">URL Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-[var(--foreground)] font-mono"
              placeholder="e.g., delhi"
              required
            />
            <p className="text-xs text-[var(--foreground-muted)] mt-1">Used in URLs: /delhi/...</p>
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
              disabled={loading || !name.trim() || !slug.trim()}
              className="px-5 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-light)] disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg transition-all"
            >
              {loading ? "Creating..." : "Create Hub"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BulkResearchModal({ cities, onClose }: { cities: CityHub[]; onClose: () => void }) {
  const [selectedCities, setSelectedCities] = useState<Set<string>>(new Set());
  const [researching, setResearching] = useState(false);
  const [results, setResults] = useState<BulkResearchResult[]>([]);

  const toggleCity = (slug: string) => {
    setSelectedCities((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedCities(new Set(cities.map((c) => c.slug)));
  };

  const clearAll = () => {
    setSelectedCities(new Set());
  };

  const handleResearch = async () => {
    if (selectedCities.size === 0) return;

    setResearching(true);
    setResults([]);

    const citiesToResearch = cities
      .filter((c) => selectedCities.has(c.slug))
      .map((c) => ({ slug: c.slug, name: c.name }));

    try {
      const res = await fetch("/api/content/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk-research",
          cities: citiesToResearch,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setResults(data.results);
    } catch (err) {
      console.error("Bulk research failed:", err);
    } finally {
      setResearching(false);
    }
  };

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--background-card)] rounded-2xl shadow-2xl w-full max-w-lg border border-[var(--border)] max-h-[80vh] flex flex-col">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Bulk PAA Research</h3>
          <button
            onClick={onClose}
            disabled={researching}
            className="p-1 text-[var(--foreground-muted)] hover:text-[var(--foreground)] rounded-lg hover:bg-[var(--border)] transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {results.length === 0 ? (
            <>
              <p className="text-sm text-[var(--foreground-muted)] mb-4">
                Select cities to research PAA questions for. This will fetch questions for all selected cities.
              </p>

              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[var(--foreground-muted)]">
                  {selectedCities.size} of {cities.length} selected
                </span>
                <div className="flex gap-2 text-sm">
                  <button onClick={selectAll} className="text-[var(--primary)] hover:underline">
                    Select All
                  </button>
                  <button onClick={clearAll} className="text-[var(--foreground-muted)] hover:underline">
                    Clear
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {cities.map((city) => (
                  <label
                    key={city.slug}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedCities.has(city.slug)
                        ? "border-[var(--primary)] bg-[var(--primary)]/5"
                        : "border-[var(--border)] hover:border-[var(--primary)]/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCities.has(city.slug)}
                      onChange={() => toggleCity(city.slug)}
                      disabled={researching}
                      className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)]"
                    />
                    <span className="text-[var(--foreground)]">{city.name}</span>
                  </label>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="mb-4 p-3 bg-[var(--background)] rounded-lg">
                <p className="text-sm text-[var(--foreground)]">
                  Research complete: {successCount} succeeded, {failCount} failed
                </p>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {results.map((result) => (
                  <div
                    key={result.citySlug}
                    className={`p-3 rounded-lg border ${
                      result.success
                        ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                        : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[var(--foreground)]">{result.cityName}</span>
                      {result.success ? (
                        <span className="text-xs text-green-600 dark:text-green-400">
                          {result.questionCount} questions
                        </span>
                      ) : (
                        <span className="text-xs text-red-600 dark:text-red-400">Failed</span>
                      )}
                    </div>
                    {result.error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{result.error}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[var(--border)] flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={researching}
            className="px-4 py-2.5 text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)] rounded-xl transition-colors font-medium disabled:opacity-50"
          >
            {results.length > 0 ? "Close" : "Cancel"}
          </button>
          {results.length === 0 && (
            <button
              onClick={handleResearch}
              disabled={researching || selectedCities.size === 0}
              className="px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-light)] disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg transition-all flex items-center gap-2"
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
                `Research ${selectedCities.size} Cities`
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
