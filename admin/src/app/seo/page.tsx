"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ContentBank {
  pages: Page[];
}

interface Page {
  id: string;
  title: string;
  slug: string;
  status: string;
  tier: string;
  category: string;
}

interface CityStatus {
  slug: string;
  name: string;
  contentBank: boolean;
  generated: number;
  total: number;
}

export default function SEOPage() {
  const [cities, setCities] = useState<CityStatus[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [contentBank, setContentBank] = useState<ContentBank | null>(null);
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "generate" | "validate">("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/seo/status")
      .then((res) => res.json())
      .then((data) => {
        setCities(data.cities || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const loadContentBank = async (citySlug: string) => {
    setSelectedCity(citySlug);
    const res = await fetch(`/api/seo/content-bank/${citySlug}`);
    const data = await res.json();
    setContentBank(data);
    setSelectedPages(new Set());
  };

  const togglePage = (pageId: string) => {
    const newSet = new Set(selectedPages);
    if (newSet.has(pageId)) {
      newSet.delete(pageId);
    } else {
      newSet.add(pageId);
    }
    setSelectedPages(newSet);
  };

  const selectAll = () => {
    if (!contentBank) return;
    const pending = contentBank.pages.filter((p) => p.status !== "generated");
    setSelectedPages(new Set(pending.map((p) => p.id)));
  };

  const generateSelected = async () => {
    if (!selectedCity || selectedPages.size === 0) return;
    setGenerating(true);
    setLog(["Starting generation..."]);

    for (const pageId of selectedPages) {
      const page = contentBank?.pages.find((p) => p.id === pageId);
      setLog((prev) => [...prev, `Generating: ${page?.title || pageId}...`]);

      try {
        const res = await fetch("/api/seo/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ city: selectedCity, pageId }),
        });
        const result = await res.json();
        if (result.success) {
          setLog((prev) => [...prev, `✓ Generated: ${page?.title}`]);
        } else {
          setLog((prev) => [...prev, `✗ Failed: ${page?.title} - ${result.error}`]);
        }
      } catch (err) {
        setLog((prev) => [...prev, `✗ Error: ${page?.title}`]);
      }
    }

    setLog((prev) => [...prev, "Done!"]);
    setGenerating(false);
    // Refresh content bank
    loadContentBank(selectedCity);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "generated":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="bg-[var(--background-card)] border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
              ← Dashboard
            </Link>
            <span className="text-[var(--border)]">/</span>
            <h1 className="font-semibold text-[var(--foreground)]">SEO Content Generator</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === "overview"
                ? "bg-[var(--primary)] text-white"
                : "bg-[var(--background-card)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("generate")}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === "generate"
                ? "bg-[var(--primary)] text-white"
                : "bg-[var(--background-card)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Generate Content
          </button>
          <button
            onClick={() => setActiveTab("validate")}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === "validate"
                ? "bg-[var(--primary)] text-white"
                : "bg-[var(--background-card)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            AI Detection
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="bg-[var(--background-card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-semibold mb-4">City Content Status</h2>
            {loading ? (
              <p className="text-[var(--foreground-muted)]">Loading...</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 px-4">City</th>
                    <th className="text-left py-3 px-4">Content Bank</th>
                    <th className="text-left py-3 px-4">Generated</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cities.map((city) => (
                    <tr key={city.slug} className="border-b border-[var(--border)]">
                      <td className="py-3 px-4 font-medium capitalize">{city.name}</td>
                      <td className="py-3 px-4">
                        <span className={city.contentBank ? "text-green-600" : "text-gray-400"}>
                          {city.contentBank ? "✓ Ready" : "—"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {city.generated}/{city.total} pages
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => {
                            loadContentBank(city.slug);
                            setActiveTab("generate");
                          }}
                          className="text-[var(--primary)] hover:underline"
                        >
                          Manage →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Generate Tab */}
        {activeTab === "generate" && (
          <div className="space-y-6">
            {/* City Selector */}
            <div className="bg-[var(--background-card)] rounded-2xl p-6 border border-[var(--border)]">
              <h2 className="text-xl font-semibold mb-4">Select City</h2>
              <div className="flex gap-2 flex-wrap">
                {cities.map((city) => (
                  <button
                    key={city.slug}
                    onClick={() => loadContentBank(city.slug)}
                    className={`px-4 py-2 rounded-lg font-medium capitalize ${
                      selectedCity === city.slug
                        ? "bg-[var(--primary)] text-white"
                        : "bg-[var(--background)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border)]"
                    }`}
                  >
                    {city.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Bank */}
            {selectedCity && contentBank && (
              <div className="bg-[var(--background-card)] rounded-2xl p-6 border border-[var(--border)]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold capitalize">{selectedCity} Pages</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAll}
                      className="px-3 py-1 text-sm bg-[var(--background)] rounded border border-[var(--border)] hover:border-[var(--primary)]"
                    >
                      Select Pending
                    </button>
                    <button
                      onClick={generateSelected}
                      disabled={generating || selectedPages.size === 0}
                      className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium disabled:opacity-50"
                    >
                      {generating ? "Generating..." : `Generate (${selectedPages.size})`}
                    </button>
                  </div>
                </div>

                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="w-10 py-3 px-4"></th>
                      <th className="text-left py-3 px-4">Title</th>
                      <th className="text-left py-3 px-4">Slug</th>
                      <th className="text-left py-3 px-4">Tier</th>
                      <th className="text-left py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contentBank.pages.map((page) => (
                      <tr key={page.id} className="border-b border-[var(--border)]">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedPages.has(page.id)}
                            onChange={() => togglePage(page.id)}
                            disabled={page.status === "generated"}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="py-3 px-4">{page.title}</td>
                        <td className="py-3 px-4 text-[var(--foreground-muted)] text-sm font-mono">
                          {page.slug}
                        </td>
                        <td className="py-3 px-4">{page.tier}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(page.status)}`}>
                            {page.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Generation Log */}
            {log.length > 0 && (
              <div className="bg-[var(--background-card)] rounded-2xl p-6 border border-[var(--border)]">
                <h2 className="text-xl font-semibold mb-4">Generation Log</h2>
                <div className="bg-black text-green-400 font-mono text-sm p-4 rounded-lg max-h-64 overflow-y-auto">
                  {log.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Validate Tab */}
        {activeTab === "validate" && (
          <div className="bg-[var(--background-card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-semibold mb-4">AI Detection Scores</h2>
            <p className="text-[var(--foreground-muted)] mb-4">
              Run validation to check content for AI-detectable patterns.
            </p>
            <button
              onClick={() => {
                // TODO: Implement validation
                alert("Validation coming soon - use the CLI validator for now");
              }}
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium"
            >
              Run AI Detection
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
