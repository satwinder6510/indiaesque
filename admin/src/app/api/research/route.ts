import { NextRequest, NextResponse } from "next/server";
import { researchCity } from "@/lib/claude";
import { writeJSON, readJSON } from "@/lib/github";
import type { ContentBank, City, AdminState } from "@/lib/types";

interface CitiesData {
  cities: City[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { city, cityName, seedQueries } = body;

    if (!city || !cityName) {
      return NextResponse.json(
        { error: "City slug and name are required" },
        { status: 400 }
      );
    }

    // Default seed queries if not provided
    const queries = seedQueries || [
      `things to do in ${cityName}`,
      `${cityName} travel guide`,
      `is ${cityName} safe`,
      `best food in ${cityName}`,
      `${cityName} itinerary`,
      `${cityName} shopping`,
    ];

    // Call Claude API for research
    const result = await researchCity(cityName, city, queries);

    // Build content bank from research result
    const contentBank: ContentBank = {
      city,
      cityName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      researchSources: queries,
      categories: result.categories || [],
      pages: result.pages.map((page) => ({
        ...page,
        status: "not-started" as const,
        wordCount: null,
        generatedAt: null,
        validationErrors: [],
      })),
      notes: result.notes || "",
    };

    // Save content bank to GitHub
    await writeJSON(
      `india-experiences/data/content-banks/${city}.json`,
      contentBank,
      `feat(content-bank): create ${city} content bank from research [admin-tool]`
    );

    // Update city status
    const citiesData = await readJSON<CitiesData>("india-experiences/data/cities.json");
    if (citiesData) {
      const cityIndex = citiesData.cities.findIndex((c) => c.slug === city);
      if (cityIndex !== -1) {
        citiesData.cities[cityIndex].status = "content-bank-ready";
        await writeJSON(
          "india-experiences/data/cities.json",
          citiesData,
          `feat: update ${city} status to content-bank-ready [admin-tool]`
        );
      }
    }

    // Update admin state
    const adminState = (await readJSON<AdminState>("india-experiences/data/admin-state.json")) || {
      lastUpdated: new Date().toISOString(),
      apiCalls: { research: { total: 0, today: 0 }, generation: { total: 0, today: 0 } },
      currentJob: null,
      jobHistory: [],
    };

    const today = new Date().toISOString().split("T")[0];
    const lastDay = adminState.lastUpdated?.split("T")[0];

    adminState.apiCalls.research.total += 1;
    adminState.apiCalls.research.today = lastDay === today ? adminState.apiCalls.research.today + 1 : 1;
    adminState.lastUpdated = new Date().toISOString();
    adminState.jobHistory.push({
      type: "research",
      city,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      pagesDiscovered: contentBank.pages.length,
      status: "completed",
    });

    await writeJSON(
      "india-experiences/data/admin-state.json",
      adminState,
      `chore: update admin state after ${city} research [admin-tool]`
    );

    return NextResponse.json({
      status: "completed",
      contentBank,
      totalPages: contentBank.pages.length,
    });
  } catch (error) {
    console.error("Research error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Research failed" },
      { status: 500 }
    );
  }
}
