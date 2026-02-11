"use client";

import { useState, useMemo } from "react";

interface PAAQuestion {
  id: string;
  question: string;
  category: string;
  searchVolume: "high" | "medium" | "low";
  selected: boolean;
  researchedAt: string;
}

interface PAAResearchPanelProps {
  questions: PAAQuestion[];
  lastResearchedAt?: string;
  onResearch: () => void;
  onToggleQuestion: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onSaveQuestions: (questions: PAAQuestion[]) => void;
  isResearching: boolean;
  cityName: string;
}

export default function PAAResearchPanel({
  questions,
  lastResearchedAt,
  onResearch,
  onToggleQuestion,
  onSelectAll,
  onClearAll,
  onSaveQuestions,
  isResearching,
  cityName,
}: PAAResearchPanelProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(questions.map((q) => q.category));
    return ["all", ...Array.from(cats).sort()];
  }, [questions]);

  // Filter questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchesCategory = categoryFilter === "all" || q.category === categoryFilter;
      const matchesSearch = !searchQuery || q.question.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [questions, categoryFilter, searchQuery]);

  const selectedCount = questions.filter((q) => q.selected).length;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getVolumeBadgeClass = (volume: string) => {
    switch (volume) {
      case "high":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "medium":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  return (
    <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-[var(--foreground)]">PAA Research</h3>
            <p className="text-sm text-[var(--foreground-muted)]">
              Research People Also Ask questions for {cityName}
            </p>
          </div>
          <button
            onClick={onResearch}
            disabled={isResearching}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isResearching ? (
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

        {lastResearchedAt && (
          <p className="text-xs text-[var(--foreground-muted)]">
            Last researched: {formatDate(lastResearchedAt)}
          </p>
        )}
      </div>

      {/* Filters */}
      {questions.length > 0 && (
        <div className="p-4 border-b border-[var(--border)] bg-[var(--background)]">
          <div className="flex flex-wrap items-center gap-3">
            {/* Category filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-[var(--foreground-muted)]">Category:</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 bg-[var(--background-card)] border border-[var(--border)] rounded-lg text-sm text-[var(--foreground)]"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "all" ? "All Categories" : cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions..."
                className="w-full px-3 py-1.5 bg-[var(--background-card)] border border-[var(--border)] rounded-lg text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]"
              />
            </div>

            {/* Selection controls */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[var(--foreground-muted)]">
                {selectedCount} of {questions.length} selected
              </span>
              <button
                onClick={onSelectAll}
                className="text-[var(--primary)] hover:underline"
              >
                Select All
              </button>
              <button
                onClick={onClearAll}
                className="text-[var(--foreground-muted)] hover:underline"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Questions List */}
      {questions.length > 0 ? (
        <div className="divide-y divide-[var(--border)] max-h-96 overflow-y-auto">
          {filteredQuestions.map((q) => (
            <label
              key={q.id}
              className={`flex items-start gap-3 p-4 cursor-pointer transition-colors ${
                q.selected
                  ? "bg-[var(--primary)]/5"
                  : "hover:bg-[var(--background)]"
              }`}
            >
              <input
                type="checkbox"
                checked={q.selected}
                onChange={() => onToggleQuestion(q.id)}
                className="mt-1 w-4 h-4 rounded border-[var(--border)] text-[var(--primary)]"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[var(--foreground)]">{q.question}</p>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  <span className="text-xs px-2 py-0.5 bg-[var(--background)] text-[var(--foreground-muted)] rounded">
                    {q.category}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${getVolumeBadgeClass(q.searchVolume)}`}>
                    {q.searchVolume} volume
                  </span>
                </div>
              </div>
            </label>
          ))}

          {filteredQuestions.length === 0 && (
            <div className="p-8 text-center text-[var(--foreground-muted)]">
              No questions match your filters
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center text-[var(--foreground-muted)]">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p>Click "Research PAA" to find questions people ask about {cityName}</p>
        </div>
      )}

      {/* Save button */}
      {questions.length > 0 && (
        <div className="p-4 border-t border-[var(--border)] bg-[var(--background)]">
          <button
            onClick={() => onSaveQuestions(questions)}
            className="w-full py-2.5 bg-[var(--background-card)] hover:bg-[var(--border)] text-[var(--foreground)] font-medium rounded-lg border border-[var(--border)] transition-colors"
          >
            Save Research
          </button>
        </div>
      )}
    </div>
  );
}
