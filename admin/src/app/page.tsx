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

interface ContentStats {
  hubCount: number;
  pageCount: number;
}

interface StaycationStats {
  count: number;
}

interface DataResponse {
  cities?: CityData[];
}

export default function Dashboard() {
  const [data, setData] = useState<DataResponse | null>(null);
  const [contentStats, setContentStats] = useState<ContentStats>({ hubCount: 0, pageCount: 0 });
  const [staycationStats, setStaycationStats] = useState<StaycationStats>({ count: 0 });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      fetch("/api/data").then(res => res.json()),
      fetch("/api/content").then(res => res.json()),
      fetch("/api/staycations").then(res => res.json()),
    ])
      .then(([cityData, contentData, staycationData]) => {
        setData(cityData);
        const hubs = contentData.cities || [];
        setContentStats({
          hubCount: hubs.length,
          pageCount: hubs.reduce((sum: number, h: { pageCount: number }) => sum + h.pageCount, 0),
        });
        setStaycationStats({ count: staycationData.staycations?.length || 0 });
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
      total += 2;
      if (city.images.hero.exists) uploaded++;
      if (city.images.card.exists) uploaded++;
    });
    return { uploaded, total };
  };

  const imageStats = countImages();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="bg-[var(--background-card)] border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center font-bold">
              IE
            </div>
            <div>
              <h1 className="font-semibold text-[var(--foreground)]">Indiaesque Admin</h1>
              <p className="text-sm text-[var(--foreground-muted)]">Content Management</p>
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

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Dashboard</h2>
          <p className="text-[var(--foreground-muted)] mt-1">
            Manage your travel content and images
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Homepage Card */}
            <Link
              href="/homepage"
              className="block bg-[var(--background-card)] rounded-2xl p-6 border border-[var(--border)] hover:border-[var(--primary)] hover:shadow-lg transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[var(--primary)] mb-4 group-hover:scale-110 transition-transform inline-block">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-[var(--foreground)] mb-1">
                    Homepage
                  </h3>
                  <p className="text-[var(--foreground-muted)] text-sm mb-4">
                    Hero, intro & features
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end text-sm pt-4 border-t border-[var(--border)]">
                <span className="text-[var(--primary)] font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  Edit
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </Link>

            {/* About Card */}
            <Link
              href="/about"
              className="block bg-[var(--background-card)] rounded-2xl p-6 border border-[var(--border)] hover:border-[var(--primary)] hover:shadow-lg transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[var(--primary)] mb-4 group-hover:scale-110 transition-transform inline-block">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-[var(--foreground)] mb-1">
                    About Us
                  </h3>
                  <p className="text-[var(--foreground-muted)] text-sm mb-4">
                    Story, mission & contact
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end text-sm pt-4 border-t border-[var(--border)]">
                <span className="text-[var(--primary)] font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  Edit
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </Link>

            {/* Content Card */}
            <Link
              href="/content"
              className="block bg-[var(--background-card)] rounded-2xl p-6 border border-[var(--border)] hover:border-[var(--primary)] hover:shadow-lg transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[var(--primary)] mb-4 group-hover:scale-110 transition-transform inline-block">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-[var(--foreground)] mb-1">
                    Content
                  </h3>
                  <p className="text-[var(--foreground-muted)] text-sm mb-4">
                    City hubs & article pages
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-[var(--foreground)]">
                    {contentStats.hubCount}
                  </div>
                  <div className="text-sm text-[var(--foreground-muted)]">hubs</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm pt-4 border-t border-[var(--border)]">
                <span className="text-[var(--foreground-muted)]">
                  {contentStats.pageCount} sub-pages
                </span>
                <span className="text-[var(--primary)] font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  Manage
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </Link>

            {/* Cities Card */}
            <Link
              href="/cities"
              className="block bg-[var(--background-card)] rounded-2xl p-6 border border-[var(--border)] hover:border-[var(--primary)] hover:shadow-lg transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[var(--primary)] mb-4 group-hover:scale-110 transition-transform inline-block">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-[var(--foreground)] mb-1">
                    Images
                  </h3>
                  <p className="text-[var(--foreground-muted)] text-sm mb-4">
                    Upload hero and card images
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
                  {imageStats.uploaded}/{imageStats.total} uploaded
                </span>
                <span className="text-[var(--primary)] font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  Manage
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </Link>

            {/* Staycations Card */}
            <Link
              href="/staycations"
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
                    Staycations
                  </h3>
                  <p className="text-[var(--foreground-muted)] text-sm mb-4">
                    Hotels, rooms & bookings
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-[var(--foreground)]">
                    {staycationStats.count}
                  </div>
                  <div className="text-sm text-[var(--foreground-muted)]">properties</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm pt-4 border-t border-[var(--border)]">
                <span className="text-[var(--foreground-muted)]">
                  Galleries, rooms, transfers
                </span>
                <span className="text-[var(--primary)] font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  Manage
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </Link>

            {/* Experiences Card */}
            <Link
              href="/experiences"
              className="block bg-[var(--background-card)] rounded-2xl p-6 border border-[var(--border)] hover:border-[var(--primary)] hover:shadow-lg transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[var(--primary)] mb-4 group-hover:scale-110 transition-transform inline-block">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-[var(--foreground)] mb-1">
                    Experiences
                  </h3>
                  <p className="text-[var(--foreground-muted)] text-sm mb-4">
                    Tours, activities & images
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm pt-4 border-t border-[var(--border)]">
                <span className="text-[var(--foreground-muted)]">
                  Homepage featured
                </span>
                <span className="text-[var(--primary)] font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  Manage
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
