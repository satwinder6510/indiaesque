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
  viatorTagId?: number;
  showOnHomepage?: boolean;
  hasLocalImage?: boolean;
  isExternalImage?: boolean;
  // Curated fields
  curated?: boolean;
  cities?: string[];
  price?: string;
  duration?: string;
  bookingUrl?: string;
  priority?: number;
  active?: boolean;
}

const CITIES = [
  { slug: "delhi", name: "Delhi" },
  { slug: "jaipur", name: "Jaipur" },
  { slug: "mumbai", name: "Mumbai" },
  { slug: "goa", name: "Goa" },
  { slug: "varanasi", name: "Varanasi" },
  { slug: "udaipur", name: "Udaipur" },
  { slug: "agra", name: "Agra" },
  { slug: "kolkata", name: "Kolkata" },
  { slug: "kochi", name: "Kochi" },
  { slug: "rishikesh", name: "Rishikesh" },
  { slug: "amritsar", name: "Amritsar" },
];

export default function ExperiencesPage() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingExp, setEditingExp] = useState<Experience | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"types" | "curated">("types");
  const [newExp, setNewExp] = useState({
    name: "",
    slug: "",
    category: "",
    description: "",
    cities: [] as string[],
    price: "",
    duration: "",
    bookingUrl: "",
    priority: 10,
  });

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

  const typeExperiences = experiences.filter((e) => !e.curated);
  const curatedExperiences = experiences.filter((e) => e.curated);

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

  const toggleActive = async (slug: string, currentValue: boolean) => {
    setSaving(slug);
    try {
      const res = await fetch("/api/experiences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          updates: { active: !currentValue },
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
          updates: editingExp.curated
            ? {
                name: editingExp.name,
                category: editingExp.category,
                description: editingExp.description,
                cities: editingExp.cities,
                price: editingExp.price,
                duration: editingExp.duration,
                bookingUrl: editingExp.bookingUrl,
                priority: editingExp.priority,
              }
            : {
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

  const createCurated = async () => {
    if (!newExp.name || !newExp.slug) {
      setError("Name and slug are required");
      return;
    }
    setSaving("new");
    try {
      const res = await fetch("/api/experiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newExp,
          curated: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create");
      }
      setShowAddModal(false);
      setNewExp({
        name: "",
        slug: "",
        category: "",
        description: "",
        cities: [],
        price: "",
        duration: "",
        bookingUrl: "",
        priority: 10,
      });
      await fetchExperiences();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(null);
    }
  };

  const deleteExperience = async (slug: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setSaving(slug);
    try {
      const res = await fetch(`/api/experiences?slug=${slug}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      await fetchExperiences();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setSaving(null);
    }
  };

  const toggleCity = (city: string) => {
    if (editingExp) {
      const cities = editingExp.cities || [];
      setEditingExp({
        ...editingExp,
        cities: cities.includes(city) ? cities.filter((c) => c !== city) : [...cities, city],
      });
    }
  };

  const toggleNewCity = (city: string) => {
    setNewExp({
      ...newExp,
      cities: newExp.cities.includes(city)
        ? newExp.cities.filter((c) => c !== city)
        : [...newExp.cities, city],
    });
  };

  const homepageCount = typeExperiences.filter((e) => e.showOnHomepage).length;
  const activeCount = curatedExperiences.filter((e) => e.active).length;

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
            <Link href="/" className="text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-[var(--foreground)]">Experiences</h1>
              <p className="text-sm text-[var(--foreground-muted)]">
                {typeExperiences.length} types · {curatedExperiences.length} curated
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <div className="flex gap-1 bg-[var(--background-card)] p-1 rounded-xl border border-[var(--border)] w-fit">
          <button
            onClick={() => setActiveTab("types")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "types"
                ? "bg-[var(--primary)] text-white"
                : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Experience Types ({typeExperiences.length})
          </button>
          <button
            onClick={() => setActiveTab("curated")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "curated"
                ? "bg-[var(--primary)] text-white"
                : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Curated ({curatedExperiences.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">
              Dismiss
            </button>
          </div>
        )}

        {activeTab === "types" ? (
          /* Experience Types Tab */
          <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--background)]">
              <p className="text-sm text-[var(--foreground-muted)]">
                {homepageCount} shown on homepage · Toggle to show/hide
              </p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--foreground-muted)] uppercase">Image</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--foreground-muted)] uppercase">Experience</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--foreground-muted)] uppercase">Category</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-[var(--foreground-muted)] uppercase">Homepage</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--foreground-muted)] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {typeExperiences.map((exp) => (
                  <tr key={exp.slug} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]">
                    <td className="py-3 px-4">
                      <div className="relative w-16 h-12 rounded overflow-hidden bg-[var(--border)]">
                        {exp.cardImage ? (
                          <img src={exp.cardImage} alt={exp.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--foreground-muted)]">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        {exp.isExternalImage && (
                          <span className="absolute bottom-0 right-0 bg-yellow-500 text-white text-[8px] px-1 py-0.5">EXT</span>
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
                          exp.showOnHomepage ? "bg-green-500" : "bg-[var(--border)]"
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
                          {uploading === exp.slug ? "..." : "Upload"}
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
        ) : (
          /* Curated Tab */
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-[var(--foreground-muted)]">
                {activeCount} active · Injected before Viator/GYG results
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-[var(--primary)] text-white rounded-xl font-medium hover:opacity-90"
              >
                + Add Curated
              </button>
            </div>

            <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] overflow-hidden">
              {curatedExperiences.length === 0 ? (
                <div className="p-8 text-center text-[var(--foreground-muted)]">
                  No curated experiences yet. Click "Add Curated" to create one.
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--foreground-muted)] uppercase">Image</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--foreground-muted)] uppercase">Experience</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--foreground-muted)] uppercase">Cities</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--foreground-muted)] uppercase">Price</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-[var(--foreground-muted)] uppercase">Active</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--foreground-muted)] uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {curatedExperiences
                      .sort((a, b) => (a.priority || 10) - (b.priority || 10))
                      .map((exp) => (
                        <tr key={exp.slug} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]">
                          <td className="py-3 px-4">
                            <div className="relative w-16 h-12 rounded overflow-hidden bg-[var(--border)]">
                              {exp.cardImage ? (
                                <img src={exp.cardImage} alt={exp.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[var(--foreground-muted)]">
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-[var(--foreground)]">{exp.name}</div>
                            <div className="text-xs text-[var(--foreground-muted)]">
                              {exp.duration} · Priority {exp.priority}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {(exp.cities || []).map((city) => (
                                <span
                                  key={city}
                                  className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                >
                                  {city}
                                </span>
                              ))}
                              {(!exp.cities || exp.cities.length === 0) && (
                                <span className="text-xs text-[var(--foreground-muted)]">No cities</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--foreground)]">{exp.price || "—"}</td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => toggleActive(exp.slug, exp.active || false)}
                              disabled={saving === exp.slug}
                              className={`w-12 h-6 rounded-full transition-colors relative ${
                                exp.active ? "bg-green-500" : "bg-[var(--border)]"
                              }`}
                            >
                              <span
                                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                  exp.active ? "left-7" : "left-1"
                                }`}
                              />
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <label className="cursor-pointer text-sm text-[var(--primary)] hover:underline">
                                {uploading === exp.slug ? "..." : "Upload"}
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
                              <button
                                onClick={() => deleteExperience(exp.slug, exp.name)}
                                className="text-sm text-red-500 hover:underline"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {editingExp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--background-card)] rounded-2xl shadow-2xl w-full max-w-lg border border-[var(--border)] max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between sticky top-0 bg-[var(--background-card)]">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">
                Edit {editingExp.curated ? "Curated" : "Experience"}
              </h3>
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
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Category</label>
                <input
                  type="text"
                  value={editingExp.category}
                  onChange={(e) => setEditingExp({ ...editingExp, category: e.target.value })}
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Description</label>
                <textarea
                  value={editingExp.description}
                  onChange={(e) => setEditingExp({ ...editingExp, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
                />
              </div>

              {editingExp.curated ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Inject into Cities</label>
                    <div className="flex flex-wrap gap-2">
                      {CITIES.map((city) => (
                        <button
                          key={city.slug}
                          type="button"
                          onClick={() => toggleCity(city.slug)}
                          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                            (editingExp.cities || []).includes(city.slug)
                              ? "bg-blue-500 border-blue-500 text-white"
                              : "border-[var(--border)] text-[var(--foreground-muted)] hover:border-blue-500"
                          }`}
                        >
                          {city.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Price</label>
                      <input
                        type="text"
                        value={editingExp.price || ""}
                        onChange={(e) => setEditingExp({ ...editingExp, price: e.target.value })}
                        placeholder="₹2,500"
                        className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Duration</label>
                      <input
                        type="text"
                        value={editingExp.duration || ""}
                        onChange={(e) => setEditingExp({ ...editingExp, duration: e.target.value })}
                        placeholder="3 hours"
                        className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Booking URL</label>
                    <input
                      type="url"
                      value={editingExp.bookingUrl || ""}
                      onChange={(e) => setEditingExp({ ...editingExp, bookingUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Priority (lower = first)</label>
                    <input
                      type="number"
                      value={editingExp.priority || 10}
                      onChange={(e) => setEditingExp({ ...editingExp, priority: parseInt(e.target.value) || 10 })}
                      className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Viator Tag ID</label>
                  <input
                    type="number"
                    value={editingExp.viatorTagId || 0}
                    onChange={(e) => setEditingExp({ ...editingExp, viatorTagId: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
                  />
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[var(--border)] flex justify-end gap-3 sticky bottom-0 bg-[var(--background-card)]">
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

      {/* Add Curated Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--background-card)] rounded-2xl shadow-2xl w-full max-w-lg border border-[var(--border)] max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between sticky top-0 bg-[var(--background-card)]">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">Add Curated Experience</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Name *</label>
                <input
                  type="text"
                  value={newExp.name}
                  onChange={(e) => setNewExp({ ...newExp, name: e.target.value })}
                  placeholder="Private Delhi Food Walk"
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Slug *</label>
                <input
                  type="text"
                  value={newExp.slug}
                  onChange={(e) => setNewExp({ ...newExp, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                  placeholder="delhi-food-walk"
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Category</label>
                <input
                  type="text"
                  value={newExp.category}
                  onChange={(e) => setNewExp({ ...newExp, category: e.target.value })}
                  placeholder="Food & Drink"
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Description</label>
                <textarea
                  value={newExp.description}
                  onChange={(e) => setNewExp({ ...newExp, description: e.target.value })}
                  rows={3}
                  placeholder="Explore Old Delhi's best street food with a local guide..."
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Inject into Cities</label>
                <div className="flex flex-wrap gap-2">
                  {CITIES.map((city) => (
                    <button
                      key={city.slug}
                      type="button"
                      onClick={() => toggleNewCity(city.slug)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        newExp.cities.includes(city.slug)
                          ? "bg-blue-500 border-blue-500 text-white"
                          : "border-[var(--border)] text-[var(--foreground-muted)] hover:border-blue-500"
                      }`}
                    >
                      {city.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Price</label>
                  <input
                    type="text"
                    value={newExp.price}
                    onChange={(e) => setNewExp({ ...newExp, price: e.target.value })}
                    placeholder="₹2,500"
                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Duration</label>
                  <input
                    type="text"
                    value={newExp.duration}
                    onChange={(e) => setNewExp({ ...newExp, duration: e.target.value })}
                    placeholder="3 hours"
                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Booking URL</label>
                <input
                  type="url"
                  value={newExp.bookingUrl}
                  onChange={(e) => setNewExp({ ...newExp, bookingUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Priority (lower = first)</label>
                <input
                  type="number"
                  value={newExp.priority}
                  onChange={(e) => setNewExp({ ...newExp, priority: parseInt(e.target.value) || 10 })}
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[var(--border)] flex justify-end gap-3 sticky bottom-0 bg-[var(--background-card)]">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              >
                Cancel
              </button>
              <button
                onClick={createCurated}
                disabled={saving === "new"}
                className="px-5 py-2 bg-[var(--primary)] text-white font-medium rounded-xl disabled:opacity-50"
              >
                {saving === "new" ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
