import { NextResponse } from "next/server";
import { readJSON, listDirectory, CONTENT_BASE } from "@/lib/github";
import type { City, ContentBank, AdminState, DashboardStatus, CityDashboardItem } from "@/lib/types";

interface CitiesData {
  cities: City[];
}

export async function GET() {
  try {
    // Fetch cities from cities.json or scan content directories
    let cities: City[] = [];
    const citiesData = await readJSON<CitiesData>("india-experiences/data/cities.json");

    if (citiesData?.cities?.length) {
      cities = citiesData.cities;
    } else {
      // Fallback: scan content directories
      const dirs = await listDirectory(CONTENT_BASE);
      cities = dirs
        .filter((d) => d.type === "dir")
        .map((d) => ({
          name: d.name.charAt(0).toUpperCase() + d.name.slice(1),
          slug: d.name,
          state: "",
          tier: 2 as const,
          coordinates: { lat: 0, lng: 0 },
          airport: "",
          nearestHub: null,
          status: "content" as const,
        }));
    }

    // Fetch admin state
    const adminState = await readJSON<AdminState>("india-experiences/data/admin-state.json");

    // Build dashboard items for each city
    const dashboardItems: CityDashboardItem[] = await Promise.all(
      cities.map(async (city) => {
        let totalPages = 0;
        let generated = 0;
        let validated = 0;
        let published = 0;

        // Try to get content bank for page counts
        try {
          const contentBank = await readJSON<ContentBank>(
            `india-experiences/data/content-banks/${city.slug}.json`
          );
          if (contentBank) {
            totalPages = contentBank.pages.length;
            generated = contentBank.pages.filter(
              (p) => p.status !== "not-started" && p.status !== "generating"
            ).length;
            validated = contentBank.pages.filter(
              (p) => p.status === "validated" || p.status === "published"
            ).length;
            published = contentBank.pages.filter(
              (p) => p.status === "published"
            ).length;
          }
        } catch {
          // Content bank doesn't exist yet
        }

        // If no content bank, try to count actual files
        if (totalPages === 0) {
          try {
            const files = await listDirectory(`india-experiences/src/content/${city.slug}`);
            const mdFiles = files.filter((f) => f.name.endsWith(".md"));
            totalPages = mdFiles.length;
            generated = mdFiles.length;
            // Can't know validated/published without content bank
          } catch {
            // Directory doesn't exist
          }
        }

        return {
          slug: city.slug,
          name: city.name,
          status: city.status,
          totalPages,
          generated,
          validated,
          published,
        };
      })
    );

    // Calculate today's API usage
    const today = new Date().toISOString().split("T")[0];
    const lastUpdated = adminState?.lastUpdated?.split("T")[0];

    const response: DashboardStatus = {
      cities: dashboardItems,
      apiUsage: {
        researchCallsToday:
          lastUpdated === today ? adminState?.apiCalls?.research?.today || 0 : 0,
        generationCallsToday:
          lastUpdated === today ? adminState?.apiCalls?.generation?.today || 0 : 0,
      },
      currentJob: adminState?.currentJob || null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching status:", error);
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 }
    );
  }
}
