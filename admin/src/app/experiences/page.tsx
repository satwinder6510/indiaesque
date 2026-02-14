"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Experience {
  name: string;
  slug: string;
  category: string;
  description: string;
  cardImage: string;
  listImage: string;
  heroImage: string;
  href: string;
  viatorTagId: number;
  showOnHomepage?: boolean;
  hasLocalImage?: boolean;
  isExternalImage?: boolean;
}

export default function ExperiencesPage() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingExp, setEditingExp] = useState<Experience | null>(null);

  const fetchExperiences = async () => {
    try {
      const res = await fetch("/api/experiences");
      const data = await res.json();
      setExperiences(data.experiences || []);
      setError(null);
    } catch (err) {
      setError("Failed to load experiences");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExperiences();
  }, []);

  const toggleHomepage = async (slug: string, currentValue: boolean) => {
    setSaving(slug);
    try {
      const res = await fetch("/api/experiences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          updates: { showOnHomepage: !currentValue },
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      await fetchExperiences();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(null);
    }
  };

  const handleUpload = async (slug: string, file: File) => {
    setUploading(slug);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", "experiences");
    formData.append("name", slug);

    try {
      const res = await fetch("/api/images", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      // Update the experience with local image path
      await fetch("/api/experiences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          updates: {
            cardImage: `/images/experiences/${slug}-card.jpg`,
            listImage: `/images/experiences/${slug}-list.jpg`,
            heroImage: `/images/experiences/${slug}-hero.jpg`,
          },
        }),
      });

      await fetchExperiences();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const saveExperience = async () => {
    if (!editingExp) return;
    setSaving(editingExp.slug);
    try {
      const res = await fetch("/api/experiences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: editingExp.slug,
          updates: {
            name: editingExp.name,
            category: editingExp.category,
            description: editingExp.description,
            viatorTagId: editingExp.viatorTagId,
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setEditingExp(null);
      await fetchExperiences();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(null);
    }
  };

  const homepageCount = experiences.filter((e) => e.showOnHomepage).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-[var(--foreground-muted)]">Loading experiences...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="bg-[var(--background-card)] border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-[var(--foreground)]">Experiences</h1>
              <p className="text-sm text-[var(--foreground-muted)]">
                {experiences.length} experiences · {homepageCount} on homepage
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--foreground-muted)] uppercase">
                  Image
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--foreground-muted)] uppercase">
                  Experience
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--foreground-muted)] uppercase">
                  Category
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-[var(--foreground-muted)] uppercase">
                  Homepage
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--foreground-muted)] uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {experiences.map((exp) => (
                <tr
                  key={exp.slug}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]"
                >
                  <td className="py-3 px-4">
                    <div className="relative w-16 h-12 rounded overflow-hidden bg-[var(--border)]">
                      {exp.cardImage ? (
                        <img
                          src={exp.cardImage}
                          alt={exp.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--foreground-muted)]">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      {exp.isExternalImage && (
                        <span className="absolute bottom-0 right-0 bg-yellow-500 text-white text-[8px] px-1 py-0.5">
                          EXT
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-[var(--foreground)]">{exp.name}</div>
                    <div className="text-xs text-[var(--foreground-muted)]">/{exp.slug}/</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 text-xs rounded-full bg-[var(--border)] text-[var(--foreground-muted)]">
                      {exp.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => toggleHomepage(exp.slug, exp.showOnHomepage || false)}
                      disabled={saving === exp.slug}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        exp.showOnHomepage
                          ? "bg-green-500"
                          : "bg-[var(--border)]"
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          exp.showOnHomepage ? "left-7" : "left-1"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer text-sm text-[var(--primary)] hover:underline">
                        {uploading === exp.slug ? "Uploading..." : "Upload"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploading === exp.slug}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUpload(exp.slug, file);
                          }}
                        />
                      </label>
                      <button
                        onClick={() => setEditingExp(exp)}
                        className="text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Edit Modal */}
      {editingExp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--background-card)] rounded-2xl shadow-2xl w-full max-w-lg border border-[var(--border)]">
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">Edit Experience</h3>
              <button
                onClick={() => setEditingExp(null)}
                className="p-1 text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Name</label>
                <input
                  type="text"
                  value={editingExp.name}
                  onChange={(e) => setEditingExp({ ...editingExp, name: e.target.value })}
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Category</label>
                <input
                  type="text"
                  value={editingExp.category}
                  onChange={(e) => setEditingExp({ ...editingExp, category: e.target.value })}
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Description</label>
                <textarea
                  value={editingExp.description}
                  onChange={(e) => setEditingExp({ ...editingExp, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Viator Tag ID</label>
                <input
                  type="number"
                  value={editingExp.viatorTagId}
                  onChange={(e) => setEditingExp({ ...editingExp, viatorTagId: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[var(--border)] flex justify-end gap-3">
              <button
                onClick={() => setEditingExp(null)}
                className="px-4 py-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              >
                Cancel
              </button>
              <button
                onClick={saveExperience}
                disabled={saving === editingExp.slug}
                className="px-5 py-2 bg-[var(--primary)] text-white font-medium rounded-xl disabled:opacity-50"
              >
                {saving === editingExp.slug ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
