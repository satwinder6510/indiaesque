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
  images: { hero: ImageStatus; card: ImageStatus };
}

interface PAAStats {
  totalQuestions: number;
  answeredQuestions: number;
  citiesWithPAA: number;
}

interface DataResponse {
  cities?: CityData[];
}

export default function Dashboard() {
  const [data, setData] = useState<DataResponse | null>(null);
  const [paaStats, setPAAStats] = useState<PAAStats>({ totalQuestions: 0, answeredQuestions: 0, citiesWithPAA: 0 });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      fetch("/api/data").then(res => res.json()),
      fetch("/api/paa").then(res => res.json()),
    ])
      .then(([cityData, paaData]) => {
        setData(cityData);
        const cities = paaData.cities || [];
        setPAAStats({
          totalQuestions: cities.reduce((sum: number, c: { questionCount: number }) => sum + c.questionCount, 0),
          answeredQuestions: cities.reduce((sum: number, c: { answeredCount: number }) => sum + c.answeredCount, 0),
          citiesWithPAA: cities.filter((c: { questionCount: number }) => c.questionCount > 0).length,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const countImages = () => {
    if (!data?.cities) return { uploaded: 0, total: 0 };
    let uploaded = 0;
    let total = 0;
    data.cities.forEach((city) => {
      total += 2; // hero + card
      if (city.images.hero.exists) uploaded++;
      if (city.images.card.exists) uploaded++;
    });
    return { uploaded, total };
  };

  const imageStats = countImages();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="bg-[var(--background-card)] border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center font-bold">
              IE
            </div>
            <div>
              <h1 className="font-semibold text-[var(--foreground)]">Indiaesque Admin</h1>
              <p className="text-sm text-[var(--foreground-muted)]">Image Management</p>
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
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Dashboard</h2>
          <p className="text-[var(--foreground-muted)] mt-1">
            Upload and manage images for your travel content
          </p>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-[var(--background-card)] rounded-2xl p-6 border border-[var(--border)] animate-pulse">
              <div className="h-8 w-8 bg-[var(--border)] rounded-lg mb-4" />
              <div className="h-6 w-24 bg-[var(--border)] rounded mb-2" />
              <div className="h-4 w-32 bg-[var(--border)] rounded" />
            </div>
            <div className="bg-[var(--background-card)] rounded-2xl p-6 border border-[var(--border)] animate-pulse">
              <div className="h-8 w-8 bg-[var(--border)] rounded-lg mb-4" />
              <div className="h-6 w-24 bg-[var(--border)] rounded mb-2" />
              <div className="h-4 w-32 bg-[var(--border)] rounded" />
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Cities Card */}
            <Link
              href="/cities"
              className="block bg-[var(--background-card)] rounded-2xl p-6 border border-[var(--border)] hover:border-[var(--primary)] hover:shadow-lg transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[var(--primary)] mb-4 group-hover:scale-110 transition-transform inline-block">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-[var(--foreground)] mb-1">
                    Cities
                  </h3>
                  <p className="text-[var(--foreground-muted)] text-sm mb-4">
                    Upload hero and card images for each city
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-[var(--foreground)]">
                    {data?.cities?.length || 0}
                  </div>
                  <div className="text-sm text-[var(--foreground-muted)]">cities</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm pt-4 border-t border-[var(--border)]">
                <span className={imageStats.uploaded === imageStats.total ? "text-[var(--success)]" : "text-[var(--warning)]"}>
                  {imageStats.uploaded}/{imageStats.total} images uploaded
                </span>
                <span className="text-[var(--primary)] font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  Manage
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </Link>

            {/* PAA Research Card */}
            <Link
              href="/paa"
              className="block bg-[var(--background-card)] rounded-2xl p-6 border border-[var(--border)] hover:border-[var(--primary)] hover:shadow-lg transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[var(--primary)] mb-4 group-hover:scale-110 transition-transform inline-block">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-[var(--foreground)] mb-1">
                    PAA Research
                  </h3>
                  <p className="text-[var(--foreground-muted)] text-sm mb-4">
                    People Also Ask questions for SEO
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-[var(--foreground)]">
                    {paaStats.totalQuestions}
                  </div>
                  <div className="text-sm text-[var(--foreground-muted)]">questions</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm pt-4 border-t border-[var(--border)]">
                <span className="text-[var(--foreground-muted)]">
                  {paaStats.citiesWithPAA} cities researched
                </span>
                <span className="text-[var(--primary)] font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  Research
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
