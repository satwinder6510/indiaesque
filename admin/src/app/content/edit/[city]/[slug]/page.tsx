"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface PageData {
  frontmatter: Record<string, unknown>;
  content: string;
  raw: string;
}

export default function EditPage() {
  const params = useParams();
  const router = useRouter();
  const city = params.city as string;
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [content, setContent] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetch(`/api/seo/page/${city}/${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setPageData(data);
          setContent(data.raw);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [city, slug]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setHasChanges(newContent !== pageData?.raw);
    setSuccess(false);
  }, [pageData?.raw]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/seo/page/${city}/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(true);
      setHasChanges(false);
      // Update the original content reference
      if (pageData) {
        setPageData({ ...pageData, raw: content });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (hasChanges && !saving) {
          handleSave();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasChanges, saving, content]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-[var(--foreground-muted)]">Loading...</div>
      </div>
    );
  }

  if (error && !pageData) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">{error}</div>
          <Link href="/content" className="text-[var(--primary)] hover:underline">
            Back to Content
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Header */}
      <header className="bg-[var(--background-card)] border-b border-[var(--border)] flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/content"
              className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--foreground-muted)] text-sm capitalize">{city}</span>
                <span className="text-[var(--foreground-muted)]">/</span>
                <h1 className="font-semibold text-[var(--foreground)]">{slug}</h1>
              </div>
              {pageData?.frontmatter?.title ? (
                <p className="text-sm text-[var(--foreground-muted)] truncate max-w-md">
                  {String(pageData.frontmatter.title)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <span className="text-sm text-yellow-600 dark:text-yellow-400">Unsaved changes</span>
            )}
            {success && (
              <span className="text-sm text-green-600 dark:text-green-400">Saved!</span>
            )}
            {error && (
              <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
            )}
            <a
              href={`http://localhost:4321/${city}/${slug}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border)] rounded-lg hover:border-[var(--primary)] transition-colors"
            >
              Preview
            </a>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="px-4 py-1.5 bg-[var(--primary)] text-white rounded-lg font-medium disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  Save
                  <span className="text-xs opacity-70">Ctrl+S</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Editor */}
      <div className="flex-1 flex">
        {/* Sidebar - Frontmatter */}
        <aside className="w-72 bg-[var(--background-card)] border-r border-[var(--border)] p-4 overflow-y-auto flex-shrink-0">
          <h2 className="text-sm font-semibold text-[var(--foreground-muted)] uppercase tracking-wide mb-4">
            Frontmatter
          </h2>
          {pageData?.frontmatter && (
            <div className="space-y-3">
              {Object.entries(pageData.frontmatter).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-[var(--foreground-muted)] mb-1">
                    {key}
                  </label>
                  <div className="text-sm text-[var(--foreground)] bg-[var(--background)] rounded px-2 py-1.5 break-words">
                    {Array.isArray(value) ? (
                      <ul className="list-disc list-inside">
                        {value.map((item, i) => (
                          <li key={i} className="truncate">{String(item)}</li>
                        ))}
                      </ul>
                    ) : (
                      String(value)
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-[var(--foreground-muted)] mt-4">
            Edit frontmatter directly in the editor. Changes are reflected after save.
          </p>
        </aside>

        {/* Main Editor */}
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 p-4">
            <textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              className="w-full h-full bg-[var(--background-card)] border border-[var(--border)] rounded-xl p-4 font-mono text-sm text-[var(--foreground)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              spellCheck={false}
              placeholder="Loading content..."
            />
          </div>

          {/* Footer Stats */}
          <footer className="bg-[var(--background-card)] border-t border-[var(--border)] px-4 py-2 flex items-center justify-between text-xs text-[var(--foreground-muted)]">
            <div className="flex items-center gap-4">
              <span>
                {content.split(/\s+/).filter((w) => w.length > 0).length} words
              </span>
              <span>
                {content.length} characters
              </span>
              <span>
                {content.split("\n").length} lines
              </span>
            </div>
            <div>
              Tier {String(pageData?.frontmatter?.tier ?? "?")} · {String(pageData?.frontmatter?.type ?? "unknown")}
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
