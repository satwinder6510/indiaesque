"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CityPAASummary {
  citySlug: string;
  cityName: string;
  questionCount: number;
  answeredCount: number;
  lastResearched?: string;
  clusters: string[];
}

interface CityData {
  name: string;
  slug: string;
}

export default function PAAPage() {
  const [paaSummary, setPAASummary] = useState<CityPAASummary[]>([]);
  const [cities, setCities] = useState<CityData[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      fetch("/api/paa").then(r => r.json()),
      fetch("/api/data").then(r => r.json()),
    ])
      .then(([paaData, cityData]) => {
        setPAASummary(paaData.cities || []);
        setCities(cityData.cities || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  // Merge cities with PAA data
  const citiesWithPAA = cities.map(city => {
    const paa = paaSummary.find(p => p.citySlug === city.slug);
    return {
      ...city,
      questionCount: paa?.questionCount || 0,
      answeredCount: paa?.answeredCount || 0,
      lastResearched: paa?.lastResearched,
      clusters: paa?.clusters || [],
    };
  });

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
              <h1 className="font-semibold text-[var(--foreground)]">PAA Research</h1>
              <p className="text-sm text-[var(--foreground-muted)]">People Also Ask questions</p>
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
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[var(--foreground)]">PAA Research</h2>
          <p className="text-[var(--foreground-muted)] mt-1">
            Research and manage People Also Ask questions for each city
          </p>
        </div>

        {loading ? (
          <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] p-8 text-center text-[var(--foreground-muted)]">
            <svg className="animate-spin w-6 h-6 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading...
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
                    Questions
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
                    Clusters
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
                    Last Researched
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {citiesWithPAA.map((city, index) => (
                  <tr
                    key={city.slug}
                    className={`hover:bg-[var(--primary)]/5 transition-colors ${index % 2 === 0 ? "bg-[var(--background)]/30" : ""}`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-[var(--foreground)]">{city.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      {city.questionCount > 0 ? (
                        <span className="text-[var(--foreground)]">
                          {city.questionCount}
                          {city.answeredCount > 0 && (
                            <span className="text-[var(--foreground-muted)]"> ({city.answeredCount} answered)</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-[var(--foreground-muted)]">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {city.clusters.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {city.clusters.slice(0, 3).map(cluster => (
                            <span key={cluster} className="text-xs px-2 py-0.5 bg-[var(--primary)]/10 text-[var(--primary)] rounded">
                              {cluster}
                            </span>
                          ))}
                          {city.clusters.length > 3 && (
                            <span className="text-xs text-[var(--foreground-muted)]">+{city.clusters.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[var(--foreground-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[var(--foreground-muted)] text-sm">
                      {city.lastResearched
                        ? new Date(city.lastResearched).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/paa/${city.slug}`}
                        className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-light)] transition-colors"
                      >
                        {city.questionCount > 0 ? "Manage" : "Research"}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
