"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface HomepageData {
  hero: {
    location: string;
    title: string;
  };
  intro: {
    paragraphs: string[];
  };
  features: Feature[];
}

const iconOptions = [
  { value: "globe", label: "Globe" },
  { value: "layers", label: "Layers" },
  { value: "pin", label: "Map Pin" },
  { value: "heart", label: "Heart" },
  { value: "star", label: "Star" },
  { value: "compass", label: "Compass" },
];

export default function HomepagePage() {
  const [data, setData] = useState<HomepageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/homepage")
      .then((res) => res.json())
      .then((data) => setData(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!data) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/homepage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to save");

      setMessage({ type: "success", text: "Homepage content saved successfully!" });
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save homepage content" });
    } finally {
      setSaving(false);
    }
  };

  const updateHero = (field: "location" | "title", value: string) => {
    if (!data) return;
    setData({ ...data, hero: { ...data.hero, [field]: value } });
  };

  const updateIntroParagraph = (index: number, value: string) => {
    if (!data) return;
    const paragraphs = [...data.intro.paragraphs];
    paragraphs[index] = value;
    setData({ ...data, intro: { ...data.intro, paragraphs } });
  };

  const updateFeature = (index: number, field: keyof Feature, value: string) => {
    if (!data) return;
    const features = [...data.features];
    features[index] = { ...features[index], [field]: value };
    setData({ ...data, features });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <p className="text-[var(--foreground-muted)]">Failed to load homepage data</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="bg-[var(--background-card)] border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="font-semibold text-[var(--foreground)]">Homepage Content</h1>
              <p className="text-sm text-[var(--foreground-muted)]">Edit hero, intro, and features</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Hero Section */}
        <section className="bg-[var(--background-card)] rounded-2xl p-6 border border-[var(--border)] mb-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Hero Section</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
                Location Text
              </label>
              <input
                type="text"
                value={data.hero.location}
                onChange={(e) => updateHero("location", e.target.value)}
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
                Hero Title
              </label>
              <input
                type="text"
                value={data.hero.title}
                onChange={(e) => updateHero("title", e.target.value)}
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>
        </section>

        {/* Intro Section */}
        <section className="bg-[var(--background-card)] rounded-2xl p-6 border border-[var(--border)] mb-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Introduction Text</h2>
          <div className="space-y-4">
            {data.intro.paragraphs.map((paragraph, index) => (
              <div key={index}>
                <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
                  Paragraph {index + 1}
                </label>
                <textarea
                  value={paragraph}
                  onChange={(e) => updateIntroParagraph(index, e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] resize-none"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-[var(--background-card)] rounded-2xl p-6 border border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Features (3 Icons)</h2>
          <div className="space-y-6">
            {data.features.map((feature, index) => (
              <div key={index} className="p-4 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                <h3 className="text-sm font-medium text-[var(--foreground-muted)] mb-3">Feature {index + 1}</h3>
                <div className="grid gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
                      Icon
                    </label>
                    <select
                      value={feature.icon}
                      onChange={(e) => updateFeature(index, "icon", e.target.value)}
                      className="w-full px-4 py-3 bg-[var(--background-card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                    >
                      {iconOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={feature.title}
                      onChange={(e) => updateFeature(index, "title", e.target.value)}
                      className="w-full px-4 py-3 bg-[var(--background-card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
                      Description
                    </label>
                    <textarea
                      value={feature.description}
                      onChange={(e) => updateFeature(index, "description", e.target.value)}
                      rows={2}
                      className="w-full px-4 py-3 bg-[var(--background-card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] resize-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
