"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { DashboardStatus, CityDashboardItem, CityStatus } from "@/lib/types";

const STATUS_CONFIG: Record<CityStatus, { bg: string; text: string; label: string }> = {
  new: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-300", label: "New" },
  researching: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", label: "Researching" },
  "content-bank-ready": { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", label: "Bank Ready" },
  "content-bank-approved": { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-700 dark:text-indigo-300", label: "Approved" },
  generating: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300", label: "Generating" },
  generated: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", label: "Generated" },
  validated: { bg: "bg-teal-100 dark:bg-teal-900/30", text: "text-teal-700 dark:text-teal-300", label: "Validated" },
  "content-complete": { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", label: "Complete" },
  content: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300", label: "Has Content" },
};

export default function Dashboard() {
  const [status, setStatus] = useState<DashboardStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddCity, setShowAddCity] = useState(false);
  const router = useRouter();

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/status");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setStatus(data);
      setError("");
    } catch {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--foreground-muted)]">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-[var(--primary)] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm">
                IE
              </div>
              <h1 className="text-xl font-semibold tracking-tight">
                Indiaesque Admin
              </h1>
            </div>
            <div className="flex items-center gap-4">
              {status?.currentJob && (
                <div className="flex items-center gap-2 text-sm bg-white/10 px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse" />
                  <span>
                    {status.currentJob.type === "research" ? "Researching" : "Generating"}{" "}
                    {status.currentJob.city}
                  </span>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="text-sm text-white/80 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-[var(--primary)] to-[var(--primary-dark)] text-white pb-32 pt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
          <p className="text-white/70 mt-1">Manage your India travel content</p>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Cities"
            value={status?.cities.length || 0}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
          <StatCard
            label="Content Complete"
            value={status?.cities.filter((c) => c.status === "content-complete").length || 0}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            accent
          />
          <StatCard
            label="Research Today"
            value={status?.apiUsage.researchCallsToday || 0}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
          <StatCard
            label="Generated Today"
            value={status?.apiUsage.generationCallsToday || 0}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
        </div>

        {/* Images Section */}
        <ImagesSection cities={status?.cities || []} />

        {/* Cities table */}
        <div className="bg-[var(--background-card)] rounded-2xl shadow-xl border border-[var(--border)] overflow-hidden mt-8">
          <div className="px-6 py-5 border-b border-[var(--border)] flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Cities</h2>
              <p className="text-sm text-[var(--foreground-muted)] mt-0.5">
                Manage content for each destination
              </p>
            </div>
            <button
              onClick={() => setShowAddCity(true)}
              className="px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white text-sm font-semibold rounded-xl shadow-lg shadow-[var(--accent)]/25 hover:shadow-xl transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add City
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--background)] border-b border-[var(--border)]">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
                    City
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
                    Pages
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {status?.cities.map((city, index) => (
                  <CityRow key={city.slug} city={city} isEven={index % 2 === 0} />
                ))}
                {status?.cities.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="text-[var(--foreground-muted)]">
                        <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <p className="font-medium">No cities yet</p>
                        <p className="text-sm mt-1">Add your first city to get started</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Footer spacing */}
      <div className="h-16" />

      {/* Add City Modal */}
      {showAddCity && (
        <AddCityModal
          onClose={() => setShowAddCity(false)}
          onSuccess={() => {
            setShowAddCity(false);
            fetchStatus();
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={`bg-[var(--background-card)] rounded-2xl shadow-lg border border-[var(--border)] p-5 hover:shadow-xl transition-shadow duration-200 ${accent ? "ring-2 ring-[var(--accent)]/20" : ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className={`text-3xl font-bold ${accent ? "text-[var(--accent)]" : "text-[var(--foreground)]"}`}>
            {value}
          </div>
          <div className="text-sm text-[var(--foreground-muted)] mt-1">{label}</div>
        </div>
        <div className={`p-2 rounded-xl ${accent ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "bg-[var(--primary)]/10 text-[var(--primary)]"}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function CityRow({ city, isEven }: { city: CityDashboardItem; isEven: boolean }) {
  const router = useRouter();
  const config = STATUS_CONFIG[city.status];
  const progress = city.totalPages > 0 ? (city.generated / city.totalPages) * 100 : 0;

  return (
    <tr className={`hover:bg-[var(--primary)]/5 transition-colors ${isEven ? "bg-[var(--background)]/50" : ""}`}>
      <td className="px-6 py-4">
        <button
          onClick={() => router.push(`/city/${city.slug}`)}
          className="font-medium text-[var(--foreground)] hover:text-[var(--primary)] transition-colors"
        >
          {city.name}
        </button>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
          {config.label}
        </span>
      </td>
      <td className="px-6 py-4 text-[var(--foreground-muted)]">
        {city.totalPages || "—"}
      </td>
      <td className="px-6 py-4">
        {city.totalPages > 0 ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-[var(--border)] rounded-full overflow-hidden max-w-[120px]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? "bg-[var(--success)]" : "bg-[var(--primary)]"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm text-[var(--foreground-muted)] tabular-nums">
              {city.generated}/{city.totalPages}
            </span>
          </div>
        ) : (
          <span className="text-[var(--foreground-muted)]">—</span>
        )}
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex justify-end gap-2">
          <button
            onClick={() => router.push(`/city/${city.slug}`)}
            className="px-3 py-1.5 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)] rounded-lg transition-colors"
          >
            View
          </button>
          {city.status === "new" && (
            <button
              onClick={() => router.push(`/city/${city.slug}?tab=research`)}
              className="px-3 py-1.5 text-sm text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg transition-colors font-medium"
            >
              Research
            </button>
          )}
          {(city.status === "content-bank-approved" || city.status === "content-bank-ready") && (
            <button
              onClick={() => router.push(`/city/${city.slug}?tab=generate`)}
              className="px-3 py-1.5 text-sm text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-lg transition-colors font-medium"
            >
              Generate
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

interface CityImage {
  name: string;
  size: number;
  type: "desktop" | "mobile";
}

interface CityImagesData {
  city: string;
  images: CityImage[];
  hasDesktop: boolean;
  hasMobile: boolean;
}

function ImagesSection({ cities }: { cities: CityDashboardItem[] }) {
  const [imagesData, setImagesData] = useState<Record<string, CityImagesData>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<{ city: string; type: string } | null>(null);
  const [expanded, setExpanded] = useState(true);

  const fetchAllImages = useCallback(async () => {
    setLoading(true);
    const results: Record<string, CityImagesData> = {};

    await Promise.all(
      cities.map(async (city) => {
        try {
          const response = await fetch(`/api/images?city=${city.slug}`);
          if (response.ok) {
            results[city.slug] = await response.json();
          }
        } catch {
          // Ignore errors for individual cities
        }
      })
    );

    setImagesData(results);
    setLoading(false);
  }, [cities]);

  useEffect(() => {
    if (cities.length > 0) {
      fetchAllImages();
    }
  }, [cities, fetchAllImages]);

  const handleUpload = async (citySlug: string, type: "desktop" | "mobile", file: File) => {
    setUploading({ city: citySlug, type });

    const formData = new FormData();
    formData.append("city", citySlug);
    formData.append("type", type);
    formData.append("file", file);

    try {
      const response = await fetch("/api/images", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        await fetchAllImages();
      }
    } catch {
      // Handle error silently
    } finally {
      setUploading(null);
    }
  };

  const citiesWithImages = cities.filter((c) => imagesData[c.slug]?.hasDesktop || imagesData[c.slug]?.hasMobile).length;
  const citiesComplete = cities.filter((c) => imagesData[c.slug]?.hasDesktop && imagesData[c.slug]?.hasMobile).length;

  return (
    <div className="bg-[var(--background-card)] rounded-2xl shadow-xl border border-[var(--border)] overflow-hidden mb-8">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-5 border-b border-[var(--border)] flex justify-between items-center hover:bg-[var(--primary)]/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-left">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Hero Images</h2>
            <p className="text-sm text-[var(--foreground-muted)]">
              {citiesComplete}/{cities.length} cities complete
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-sm">
            <span className="text-[var(--foreground-muted)]">Desktop: 1920×800 </span>
            <span className="text-[var(--foreground-muted)] mx-2">|</span>
            <span className="text-[var(--foreground-muted)]">Mobile: 800×500</span>
          </div>
          <svg className={`w-5 h-5 text-[var(--foreground-muted)] transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-[var(--foreground-muted)]">
              <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading images...
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--background)] border-b border-[var(--border)]">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">City</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">Desktop (1920×800)</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">Mobile (800×500)</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {cities.map((city, index) => {
                  const cityImages = imagesData[city.slug];
                  const desktopImage = cityImages?.images.find((i) => i.type === "desktop");
                  const mobileImage = cityImages?.images.find((i) => i.type === "mobile");

                  return (
                    <tr key={city.slug} className={`hover:bg-[var(--primary)]/5 transition-colors ${index % 2 === 0 ? "bg-[var(--background)]/50" : ""}`}>
                      <td className="px-6 py-4 font-medium text-[var(--foreground)]">{city.name}</td>
                      <td className="px-6 py-4">
                        {desktopImage ? (
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm text-[var(--foreground-muted)]">{(desktopImage.size / 1024).toFixed(0)} KB</span>
                            <label className="text-xs text-[var(--primary)] hover:underline cursor-pointer ml-2">
                              Replace
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUpload(city.slug, "desktop", file);
                                }}
                                disabled={uploading !== null}
                              />
                            </label>
                          </div>
                        ) : (
                          <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg cursor-pointer transition-colors ${
                            uploading?.city === city.slug && uploading?.type === "desktop"
                              ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                              : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50"
                          }`}>
                            {uploading?.city === city.slug && uploading?.type === "desktop" ? (
                              <>
                                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Uploading...
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Upload
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUpload(city.slug, "desktop", file);
                              }}
                              disabled={uploading !== null}
                            />
                          </label>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {mobileImage ? (
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm text-[var(--foreground-muted)]">{(mobileImage.size / 1024).toFixed(0)} KB</span>
                            <label className="text-xs text-[var(--primary)] hover:underline cursor-pointer ml-2">
                              Replace
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUpload(city.slug, "mobile", file);
                                }}
                                disabled={uploading !== null}
                              />
                            </label>
                          </div>
                        ) : (
                          <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg cursor-pointer transition-colors ${
                            uploading?.city === city.slug && uploading?.type === "mobile"
                              ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                              : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50"
                          }`}>
                            {uploading?.city === city.slug && uploading?.type === "mobile" ? (
                              <>
                                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Uploading...
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Upload
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUpload(city.slug, "mobile", file);
                              }}
                              disabled={uploading !== null}
                            />
                          </label>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {desktopImage && mobileImage ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Complete
                          </span>
                        ) : desktopImage || mobileImage ? (
                          <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                            Partial
                          </span>
                        ) : (
                          <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            Missing
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function AddCityModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    state: "",
    tier: 2,
    airport: "",
    lat: "",
    lng: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, "-"),
          state: formData.state,
          tier: formData.tier,
          airport: formData.airport,
          coordinates: {
            lat: parseFloat(formData.lat) || 0,
            lng: parseFloat(formData.lng) || 0,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
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
        <div className="px-6 py-5 border-b border-[var(--border)] flex justify-between items-center">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">
            Add New City
          </h3>
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
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-[var(--foreground)]"
              placeholder="e.g., Jaipur"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              State *
            </label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-[var(--foreground)]"
              placeholder="e.g., Rajasthan"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                Tier
              </label>
              <select
                value={formData.tier}
                onChange={(e) => setFormData({ ...formData, tier: parseInt(e.target.value) as 1 | 2 })}
                className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-[var(--foreground)]"
              >
                <option value={1}>Tier 1</option>
                <option value={2}>Tier 2</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                Airport Code
              </label>
              <input
                type="text"
                value={formData.airport}
                onChange={(e) => setFormData({ ...formData, airport: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-[var(--foreground)]"
                placeholder="e.g., JAI"
                maxLength={3}
              />
            </div>
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
              disabled={loading}
              className="px-5 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-light)] disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Adding...
                </>
              ) : (
                "Add City"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
