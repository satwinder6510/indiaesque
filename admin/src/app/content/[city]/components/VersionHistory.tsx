"use client";

import { useState } from "react";

interface ContentVersion {
  id: string;
  content: string;
  wordCount: number;
  createdAt: string;
  source: "ai" | "manual";
  note?: string;
}

interface VersionHistoryProps {
  versions: ContentVersion[];
  currentVersionId?: string;
  onPreview: (version: ContentVersion) => void;
  onRevert: (versionId: string) => void;
  isLoading?: boolean;
}

export default function VersionHistory({
  versions,
  currentVersionId,
  onPreview,
  onRevert,
  isLoading = false,
}: VersionHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const handlePreview = (version: ContentVersion) => {
    setPreviewingId(version.id);
    onPreview(version);
  };

  const visibleVersions = versions.slice(0, visibleCount);
  const hasMore = versions.length > visibleCount;

  return (
    <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[var(--background)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-[var(--foreground-muted)] transition-transform ${isExpanded ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-medium text-[var(--foreground)]">Version History</span>
          <span className="text-xs px-2 py-0.5 bg-[var(--background)] text-[var(--foreground-muted)] rounded-full">
            {versions.length}
          </span>
        </div>
      </button>

      {/* Version List */}
      {isExpanded && (
        <div className="border-t border-[var(--border)]">
          {versions.length === 0 ? (
            <div className="p-4 text-center text-[var(--foreground-muted)] text-sm">
              No versions yet. Generate or publish content to create your first version.
            </div>
          ) : (
            <>
              <div className="divide-y divide-[var(--border)] max-h-80 overflow-y-auto">
                {visibleVersions.map((version) => (
                  <div
                    key={version.id}
                    className={`p-3 hover:bg-[var(--background)] transition-colors ${
                      version.id === currentVersionId ? "bg-[var(--primary)]/5" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {/* Source badge */}
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                              version.source === "ai"
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            }`}
                          >
                            {version.source === "ai" ? "AI" : "Manual"}
                          </span>

                          {/* Current badge */}
                          {version.id === currentVersionId && (
                            <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded font-medium">
                              Current
                            </span>
                          )}

                          {/* Previewing badge */}
                          {version.id === previewingId && (
                            <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded font-medium">
                              Previewing
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-[var(--foreground-muted)]">
                          <span>{formatDate(version.createdAt)}</span>
                          <span>-</span>
                          <span>{version.wordCount.toLocaleString()} words</span>
                        </div>

                        {version.note && (
                          <p className="text-xs text-[var(--foreground-muted)] mt-1 truncate">
                            {version.note}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handlePreview(version)}
                          disabled={isLoading}
                          className="p-1.5 text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)] rounded transition-colors disabled:opacity-50"
                          title="Preview"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>

                        {version.id !== currentVersionId && (
                          <button
                            onClick={() => onRevert(version.id)}
                            disabled={isLoading}
                            className="p-1.5 text-[var(--foreground-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded transition-colors disabled:opacity-50"
                            title="Revert to this version"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load more */}
              {hasMore && (
                <div className="p-2 border-t border-[var(--border)]">
                  <button
                    onClick={() => setVisibleCount((prev) => prev + 10)}
                    className="w-full py-2 text-sm text-[var(--primary)] hover:bg-[var(--primary)]/5 rounded-lg transition-colors"
                  >
                    Load more ({versions.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
