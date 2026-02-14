"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MarkdownEditor from "@/components/MarkdownEditor";

interface Highlight {
  title: string;
  description: string;
}

interface Section {
  id: string;
  title: string;
  content?: string;
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
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/about")
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        // Set first content section as active
        const firstContentSection = data.sections?.find((s: Section) => s.content);
        if (firstContentSection) {
          setActiveSection(firstContentSection.id);
        }
      })
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

  const updateSectionContent = (sectionIndex: number, value: string) => {
    if (!data) return;
    const sections = [...data.sections];
    sections[sectionIndex] = { ...sections[sectionIndex], content: value };
    setData({ ...data, sections });
  };

  const updateHighlight = (sectionIndex: number, highlightIndex: number, field: "title" | "description", value: string) => {
    if (!data) return;
    const sections = [...data.sections];
    const section = sections[sectionIndex];
    if (!section.highlights) return;
    const highlights = [...section.highlights];
    highlights[highlightIndex] = { ...highlights[highlightIndex], [field]: value };
    sections[sectionIndex] = { ...section, highlights };
    setData({ ...data, sections });
  };

  const addSection = () => {
    if (!data) return;
    const newId = `section-${Date.now()}`;
    const newSection: Section = {
      id: newId,
      title: "New Section",
      content: "",
    };
    setData({ ...data, sections: [...data.sections, newSection] });
    setActiveSection(newId);
  };

  const removeSection = (sectionId: string) => {
    if (!data) return;
    const sections = data.sections.filter(s => s.id !== sectionId);
    setData({ ...data, sections });
    // Set active to first remaining section
    if (sections.length > 0 && activeSection === sectionId) {
      setActiveSection(sections[0].id);
    }
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

  const contentSections = data.sections.filter(s => s.content !== undefined);
  const highlightSection = data.sections.find(s => s.highlights !== undefined);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="bg-[var(--background-card)] border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
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

      <main className="max-w-6xl mx-auto px-6 py-8">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Hero, Contact, Highlights */}
          <div className="space-y-6">
            {/* Hero Section */}
            <section className="bg-[var(--background-card)] rounded-2xl p-6 border border-[var(--border)]">
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
                    Address
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

            {/* Highlights Section */}
            {highlightSection && (
              <section className="bg-[var(--background-card)] rounded-2xl p-6 border border-[var(--border)]">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
                    Section Title
                  </label>
                  <input
                    type="text"
                    value={highlightSection.title}
                    onChange={(e) => {
                      const idx = data.sections.findIndex(s => s.id === highlightSection.id);
                      updateSectionTitle(idx, e.target.value);
                    }}
                    className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
                <div className="space-y-3">
                  {highlightSection.highlights?.map((highlight, highlightIndex) => (
                    <div key={highlightIndex} className="p-3 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                      <input
                        type="text"
                        value={highlight.title}
                        onChange={(e) => {
                          const idx = data.sections.findIndex(s => s.id === highlightSection.id);
                          updateHighlight(idx, highlightIndex, "title", e.target.value);
                        }}
                        placeholder="Title"
                        className="w-full px-3 py-2 mb-2 bg-[var(--background-card)] border border-[var(--border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--primary)]"
                      />
                      <input
                        type="text"
                        value={highlight.description}
                        onChange={(e) => {
                          const idx = data.sections.findIndex(s => s.id === highlightSection.id);
                          updateHighlight(idx, highlightIndex, "description", e.target.value);
                        }}
                        placeholder="Description"
                        className="w-full px-3 py-2 bg-[var(--background-card)] border border-[var(--border)] rounded text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--primary)]"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Column - Content Sections with Markdown Editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section Tabs */}
            <div className="flex gap-2 flex-wrap items-center">
              {contentSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeSection === section.id
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--background-card)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border)]"
                  }`}
                >
                  {section.title}
                </button>
              ))}
              <button
                onClick={addSection}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--background)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-dashed border-[var(--border)] hover:border-[var(--primary)] transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Section
              </button>
            </div>

            {/* Active Section Editor */}
            {contentSections.map((section) => {
              if (section.id !== activeSection) return null;
              const sectionIndex = data.sections.findIndex(s => s.id === section.id);

              return (
                <div key={section.id} className="space-y-4">
                  <div className="bg-[var(--background-card)] rounded-2xl p-6 border border-[var(--border)]">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-medium text-[var(--foreground-muted)]">
                        Section Title
                      </label>
                      {contentSections.length > 1 && (
                        <button
                          onClick={() => removeSection(section.id)}
                          className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)}
                      className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                    />
                  </div>

                  <MarkdownEditor
                    value={section.content || ""}
                    onChange={(value) => updateSectionContent(sectionIndex, value)}
                    placeholder="Write your content using markdown..."
                  />
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
