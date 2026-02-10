"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface PAAQuestion {
  id: string;
  question: string;
  cluster: string;
  contentDirection?: string;
  answered: boolean;
  source: "ai" | "manual";
  createdAt: string;
}

interface CityPAA {
  citySlug: string;
  cityName: string;
  lastResearched?: string;
  questions: PAAQuestion[];
}

const CLUSTERS = ["general", "food", "heritage", "markets", "culture", "nature", "spiritual", "nightlife", "practical"];

export default function CityPAAPage() {
  const params = useParams();
  const citySlug = params.city as string;
  const router = useRouter();

  const [data, setData] = useState<CityPAA | null>(null);
  const [cityName, setCityName] = useState("");
  const [loading, setLoading] = useState(true);
  const [researching, setResearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [pendingQuestions, setPendingQuestions] = useState<PAAQuestion[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/paa?city=${citySlug}`).then(r => r.json()),
      fetch("/api/data").then(r => r.json()),
    ])
      .then(([paaData, cityData]) => {
        setData(paaData);
        const city = cityData.cities?.find((c: { slug: string; name: string }) => c.slug === citySlug);
        setCityName(city?.name || citySlug);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [citySlug]);

  const handleResearch = async () => {
    if (!confirm("Run AI research? This will generate new questions (existing ones will be kept).")) return;

    setResearching(true);
    setError(null);

    try {
      const res = await fetch("/api/paa/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ citySlug, cityName }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      // Show pending questions for review
      setPendingQuestions(result.questions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research failed");
    } finally {
      setResearching(false);
    }
  };

  const handleSavePending = async (replace: boolean) => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/paa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          citySlug,
          cityName,
          questions: replace ? pendingQuestions : [...(data?.questions || []), ...pendingQuestions],
          replace: true,
        }),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error);
      }

      // Refresh data
      const newData = await fetch(`/api/paa?city=${citySlug}`).then(r => r.json());
      setData(newData);
      setPendingQuestions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Delete this question?")) return;

    try {
      const res = await fetch(`/api/paa?city=${citySlug}&id=${questionId}`, { method: "DELETE" });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error);
      }

      setData(prev => prev ? {
        ...prev,
        questions: prev.questions.filter(q => q.id !== questionId),
      } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const questions = data?.questions || [];
  const groupedByCluster = CLUSTERS.reduce((acc, cluster) => {
    acc[cluster] = questions.filter(q => q.cluster === cluster);
    return acc;
  }, {} as Record<string, PAAQuestion[]>);

  const filteredQuestions = selectedCluster
    ? questions.filter(q => q.cluster === selectedCluster)
    : questions;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="bg-[var(--background-card)] border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-10 h-10 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center font-bold hover:bg-[var(--primary-light)] transition-colors">
              IE
            </Link>
            <div>
              <h1 className="font-semibold text-[var(--foreground)]">{cityName} PAA</h1>
              <p className="text-sm text-[var(--foreground-muted)]">{questions.length} questions</p>
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

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Link
          href="/paa"
          className="inline-flex items-center gap-1 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to PAA Overview
        </Link>

        {/* Action Bar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[var(--foreground)]">{cityName}</h2>
            {data?.lastResearched && (
              <p className="text-[var(--foreground-muted)] text-sm">
                Last researched: {new Date(data.lastResearched).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] font-medium rounded-xl hover:bg-[var(--border)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Questions
            </button>
            <button
              onClick={handleResearch}
              disabled={researching}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white font-medium rounded-xl shadow-lg transition-all disabled:opacity-50"
            >
              {researching ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Researching...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  AI Research
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Pending Questions Review */}
        {pendingQuestions.length > 0 && (
          <div className="mb-6 p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
            <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">
              Review {pendingQuestions.length} AI-generated questions
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-400 mb-4">
              These questions were generated by AI. Review and choose how to save them.
            </p>
            <div className="max-h-64 overflow-y-auto mb-4 space-y-2">
              {pendingQuestions.map((q, i) => (
                <div key={i} className="text-sm p-2 bg-white dark:bg-[var(--background-card)] rounded border border-amber-200 dark:border-amber-800">
                  <span className="text-xs px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded mr-2">
                    {q.cluster}
                  </span>
                  {q.question}
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleSavePending(false)}
                disabled={saving}
                className="px-4 py-2 bg-[var(--primary)] text-white font-medium rounded-lg hover:bg-[var(--primary-light)] disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add to Existing"}
              </button>
              <button
                onClick={() => handleSavePending(true)}
                disabled={saving}
                className="px-4 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-500 disabled:opacity-50"
              >
                Replace All
              </button>
              <button
                onClick={() => setPendingQuestions([])}
                className="px-4 py-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] font-medium rounded-lg hover:bg-[var(--border)]"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] p-8 text-center text-[var(--foreground-muted)]">
            <svg className="animate-spin w-6 h-6 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading...
          </div>
        ) : questions.length === 0 ? (
          <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] p-12 text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-[var(--foreground-muted)] opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No questions yet</h3>
            <p className="text-[var(--foreground-muted)] mb-4">Run AI research or add questions manually to get started.</p>
          </div>
        ) : (
          <>
            {/* Cluster Filter */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setSelectedCluster(null)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  !selectedCluster
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--background)] text-[var(--foreground-muted)] hover:bg-[var(--border)]"
                }`}
              >
                All ({questions.length})
              </button>
              {CLUSTERS.map(cluster => {
                const count = groupedByCluster[cluster].length;
                if (count === 0) return null;
                return (
                  <button
                    key={cluster}
                    onClick={() => setSelectedCluster(cluster)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      selectedCluster === cluster
                        ? "bg-[var(--primary)] text-white"
                        : "bg-[var(--background)] text-[var(--foreground-muted)] hover:bg-[var(--border)]"
                    }`}
                  >
                    {cluster} ({count})
                  </button>
                );
              })}
            </div>

            {/* Questions List */}
            <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] overflow-hidden">
              <div className="divide-y divide-[var(--border)]">
                {filteredQuestions.map((q) => (
                  <div key={q.id} className="p-4 hover:bg-[var(--primary)]/5 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 bg-[var(--primary)]/10 text-[var(--primary)] rounded font-medium">
                            {q.cluster}
                          </span>
                          {q.source === "manual" && (
                            <span className="text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded">
                              manual
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-[var(--foreground)]">{q.question}</p>
                        {q.contentDirection && (
                          <p className="text-sm text-[var(--foreground-muted)] mt-1">{q.contentDirection}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
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
          </>
        )}
      </main>

      {/* Add Questions Modal */}
      {showAddModal && (
        <AddQuestionsModal
          citySlug={citySlug}
          cityName={cityName}
          onClose={() => setShowAddModal(false)}
          onSuccess={(newQuestions) => {
            setData(prev => prev ? {
              ...prev,
              questions: [...prev.questions, ...newQuestions],
            } : null);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}

function AddQuestionsModal({
  citySlug,
  cityName,
  onClose,
  onSuccess,
}: {
  citySlug: string;
  cityName: string;
  onClose: () => void;
  onSuccess: (questions: PAAQuestion[]) => void;
}) {
  const [text, setText] = useState("");
  const [cluster, setCluster] = useState("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setError("");

    // Parse questions (one per line)
    const lines = text.split("\n").filter(l => l.trim());
    const newQuestions: PAAQuestion[] = lines.map((line, i) => ({
      id: `${citySlug}-manual-${Date.now()}-${i}`,
      question: line.trim().replace(/^\d+\.\s*/, "").replace(/^\?/, "").trim(),
      cluster,
      answered: false,
      source: "manual" as const,
      createdAt: new Date().toISOString(),
    }));

    try {
      const res = await fetch("/api/paa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          citySlug,
          cityName,
          questions: newQuestions,
          replace: false,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      onSuccess(newQuestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add questions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--background-card)] rounded-2xl shadow-2xl w-full max-w-lg border border-[var(--border)]">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Add Questions</h3>
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
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Cluster
            </label>
            <select
              value={cluster}
              onChange={(e) => setCluster(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-[var(--foreground)]"
            >
              {CLUSTERS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Questions (one per line)
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-[var(--foreground)] font-mono text-sm"
              placeholder="What is the best time to visit Jaipur?&#10;How many days are enough for Jaipur?&#10;Is Jaipur safe for tourists?"
              required
            />
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
              disabled={loading || !text.trim()}
              className="px-5 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-light)] disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg transition-all"
            >
              {loading ? "Adding..." : "Add Questions"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
