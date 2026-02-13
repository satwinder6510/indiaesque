"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Highlight {
  title: string;
  description: string;
}

interface Section {
  id: string;
  title: string;
  paragraphs?: string[];
  highlights?: Highlight[];
}

interface AboutData {
  hero: {
    location: string;
    title: string;
    subtitle: string;
  };
  sections: Section[];
  contact: {
    email: string;
    phone: string;
    address: string;
  };
}

export default function AboutPage() {
  const [data, setData] = useState<AboutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/about")
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
      const res = await fetch("/api/about", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to save");

      setMessage({ type: "success", text: "About page content saved successfully!" });
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save about page content" });
    } finally {
      setSaving(false);
    }
  };

  const updateHero = (field: "location" | "title" | "subtitle", value: string) => {
    if (!data) return;
    setData({ ...data, hero: { ...data.hero, [field]: value } });
  };

  const updateContact = (field: "email" | "phone" | "address", value: string) => {
    if (!data) return;
    setData({ ...data, contact: { ...data.contact, [field]: value } });
  };

  const updateSectionTitle = (sectionIndex: number, value: string) => {
    if (!data) return;
    const sections = [...data.sections];
    sections[sectionIndex] = { ...sections[sectionIndex], title: value };
    setData({ ...data, sections });
  };

  const updateSectionParagraph = (sectionIndex: number, paragraphIndex: number, value: string) => {
    if (!data) return;
    const sections = [...data.sections];
    const paragraphs = [...(sections[sectionIndex].paragraphs || [])];
    paragraphs[paragraphIndex] = value;
    sections[sectionIndex] = { ...sections[sectionIndex], paragraphs };
    setData({ ...data, sections });
  };

  const updateHighlight = (sectionIndex: number, highlightIndex: number, field: "title" | "description", value: string) => {
    if (!data) return;
    const sections = [...data.sections];
    const highlights = [...(sections[sectionIndex].highlights || [])];
    highlights[highlightIndex] = { ...highlights[highlightIndex], [field]: value };
    sections[sectionIndex] = { ...sections[sectionIndex], highlights };
    setData({ ...data, sections });
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
        <p className="text-[var(--foreground-muted)]">Failed to load about page data</p>
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
              <h1 className="font-semibold text-[var(--foreground)]">About Page</h1>
              <p className="text-sm text-[var(--foreground-muted)]">Edit hero, sections, and contact info</p>
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
                Title
              </label>
              <input
                type="text"
                value={data.hero.title}
                onChange={(e) => updateHero("title", e.target.value)}
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
                Subtitle
              </label>
              <textarea
                value={data.hero.subtitle}
                onChange={(e) => updateHero("subtitle", e.target.value)}
                rows={2}
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] resize-none"
              />
            </div>
          </div>
        </section>

        {/* Content Sections */}
        {data.sections.map((section, sectionIndex) => (
          <section key={section.id} className="bg-[var(--background-card)] rounded-2xl p-6 border border-[var(--border)] mb-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
                Section Title
              </label>
              <input
                type="text"
                value={section.title}
                onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)}
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            {/* Paragraphs */}
            {section.paragraphs && (
              <div className="space-y-4">
                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  <div key={paragraphIndex}>
                    <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
                      Paragraph {paragraphIndex + 1}
                    </label>
                    <textarea
                      value={paragraph}
                      onChange={(e) => updateSectionParagraph(sectionIndex, paragraphIndex, e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] resize-none"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Highlights */}
            {section.highlights && (
              <div className="space-y-4">
                <p className="text-sm font-medium text-[var(--foreground-muted)]">Highlights</p>
                {section.highlights.map((highlight, highlightIndex) => (
                  <div key={highlightIndex} className="p-4 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                    <div className="grid gap-3">
                      <div>
                        <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1">
                          Title
                        </label>
                        <input
                          type="text"
                          value={highlight.title}
                          onChange={(e) => updateHighlight(sectionIndex, highlightIndex, "title", e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--background-card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={highlight.description}
                          onChange={(e) => updateHighlight(sectionIndex, highlightIndex, "description", e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--background-card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}

        {/* Contact Section */}
        <section className="bg-[var(--background-card)] rounded-2xl p-6 border border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Contact Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
                Email
              </label>
              <input
                type="email"
                value={data.contact.email}
                onChange={(e) => updateContact("email", e.target.value)}
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
                Phone
              </label>
              <input
                type="text"
                value={data.contact.phone}
                onChange={(e) => updateContact("phone", e.target.value)}
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
                Address (use \n for line breaks)
              </label>
              <textarea
                value={data.contact.address}
                onChange={(e) => updateContact("address", e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] resize-none"
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
