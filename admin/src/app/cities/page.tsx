"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ImageStatus {
  uploaded: boolean;
  exists: boolean;
}

interface CityData {
  name: string;
  slug: string;
  tier: number;
  description: string;
  images: { hero: ImageStatus; card: ImageStatus };
}

export default function CitiesPage() {
  const [cities, setCities] = useState<CityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCity, setEditingCity] = useState<CityData | null>(null);
  const router = useRouter();

  const fetchCities = async () => {
    try {
      const res = await fetch("/api/data");
      const data = await res.json();
      setCities(data.cities || []);
      setError(null);
    } catch (err) {
      setError("Failed to load cities");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCities();
  }, []);

  const handleUpload = async (citySlug: string, file: File) => {
    setUploading(citySlug);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", "cities");
    formData.append("name", citySlug);

    try {
      const res = await fetch("/api/images", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      await fetchCities();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (slug: string, name: string) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;

    setDeleting(slug);
    setError(null);

    try {
      const res = await fetch(`/api/data?slug=${slug}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
      await fetchCities();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="bg-[var(--background-card)] border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-10 h-10 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center font-bold hover:bg-[var(--primary-light)] transition-colors">
              IE
            </Link>
            <div>
              <h1 className="font-semibold text-[var(--foreground)]">Cities</h1>
              <p className="text-sm text-[var(--foreground-muted)]">Manage city images</p>
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
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[var(--foreground)]">Cities</h2>
            <p className="text-[var(--foreground-muted)] mt-1">
              Add, remove, and upload images for cities
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white font-medium rounded-xl shadow-lg transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add City
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] overflow-hidden">
            <div className="p-8 text-center text-[var(--foreground-muted)]">
              <svg className="animate-spin w-6 h-6 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading cities...
            </div>
          </div>
        ) : (
          <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--background)] border-b border-[var(--border)]">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
                    City
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
                    Hero
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
                    Card
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {cities.map((city, index) => {
                  const isComplete = city.images.hero.exists && city.images.card.exists;
                  const isUploading = uploading === city.slug;
                  const isDeleting = deleting === city.slug;

                  return (
                    <tr
                      key={city.slug}
                      className={`hover:bg-[var(--primary)]/5 transition-colors ${index % 2 === 0 ? "bg-[var(--background)]/30" : ""}`}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-[var(--foreground)]">{city.name}</div>
                          <div className="text-sm text-[var(--foreground-muted)]">Tier {city.tier}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <ImageBadge exists={city.images.hero.exists} />
                      </td>
                      <td className="px-6 py-4">
                        <ImageBadge exists={city.images.card.exists} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <label
                            className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg cursor-pointer transition-all ${
                              isUploading
                                ? "bg-[var(--primary)]/20 text-[var(--primary)] cursor-wait"
                                : isComplete
                                ? "bg-[var(--background)] text-[var(--foreground-muted)] hover:bg-[var(--border)] border border-[var(--border)]"
                                : "bg-[var(--primary)] text-white hover:bg-[var(--primary-light)]"
                            }`}
                          >
                            {isUploading ? (
                              <>
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Uploading...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                {isComplete ? "Replace" : "Upload"}
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              disabled={isUploading}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUpload(city.slug, file);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          <button
                            onClick={() => setEditingCity(city)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg text-[var(--foreground-muted)] hover:bg-[var(--border)] transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(city.slug, city.name)}
                            disabled={isDeleting}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                          >
                            {isDeleting ? (
                              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {cities.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-[var(--foreground-muted)]">
                      No cities yet. Click "Add City" to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Info box */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Image Requirements</h4>
          <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
            <li>Upload any high-quality image (at least 1200px wide recommended)</li>
            <li>Supported formats: JPEG, PNG, WebP</li>
            <li>Auto-generates: hero (1200x600), hero-mobile (800x600), card (500x313), list (800x500)</li>
          </ul>
        </div>
      </main>

      {/* Add City Modal */}
      {showAddModal && (
        <AddCityModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchCities();
          }}
        />
      )}

      {/* Edit City Modal */}
      {editingCity && (
        <EditCityModal
          city={editingCity}
          onClose={() => setEditingCity(null)}
          onSuccess={() => {
            setEditingCity(null);
            fetchCities();
          }}
        />
      )}
    </div>
  );
}

function ImageBadge({ exists }: { exists: boolean }) {
  return exists ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      Uploaded
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
      Missing
    </span>
  );
}

function EditCityModal({ city, onClose, onSuccess }: { city: CityData; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState(city.name);
  const [tier, setTier] = useState(city.tier);
  const [description, setDescription] = useState(city.description || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: city.slug, name: name.trim(), tier, description: description.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update city");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update city");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--background-card)] rounded-2xl shadow-2xl w-full max-w-md border border-[var(--border)]">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Edit {city.name}</h3>
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
              City Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-[var(--foreground)]"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Tier
            </label>
            <select
              value={tier}
              onChange={(e) => setTier(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-[var(--foreground)]"
            >
              <option value={1}>Tier 1 (Major destination)</option>
              <option value={2}>Tier 2 (Secondary destination)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-[var(--foreground)] resize-none"
              placeholder="Brief description of the city..."
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
              disabled={loading || !name.trim()}
              className="px-5 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-light)] disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg transition-all"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddCityModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [tier, setTier] = useState(2);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), tier, description: description.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add city");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add city");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--background-card)] rounded-2xl shadow-2xl w-full max-w-md border border-[var(--border)]">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Add City</h3>
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
              City Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-[var(--foreground)]"
              placeholder="e.g., Chennai"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Tier
            </label>
            <select
              value={tier}
              onChange={(e) => setTier(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-[var(--foreground)]"
            >
              <option value={1}>Tier 1 (Major destination)</option>
              <option value={2}>Tier 2 (Secondary destination)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-[var(--foreground)] resize-none"
              placeholder="Brief description of the city..."
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
              disabled={loading || !name.trim()}
              className="px-5 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-light)] disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg transition-all"
            >
              {loading ? "Adding..." : "Add City"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
