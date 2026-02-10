import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON } from "@/lib/github";
import fs from "fs";
import path from "path";

const DATA_BASE = "india-experiences/src/data";

export interface PAAQuestion {
  id: string;
  question: string;
  cluster: string;
  contentDirection?: string;
  answered: boolean;
  answer?: string;
  wordCount?: number;
  slug?: string;
  publishedAt?: string;
  source: "ai" | "manual";
  createdAt: string;
}

export interface CityPAA {
  citySlug: string;
  cityName: string;
  lastResearched?: string;
  questions: PAAQuestion[];
}

export interface PAAData {
  cities: CityPAA[];
}

const useGitHub = !!(process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO);
const getLocalPath = () => path.join(process.cwd(), "..", "india-experiences", "src", "data", "paa.json");

async function getPAAData(): Promise<PAAData> {
  if (useGitHub) {
    const data = await readJSON<PAAData>(`${DATA_BASE}/paa.json`);
    return data || { cities: [] };
  } else {
    const localPath = getLocalPath();
    if (fs.existsSync(localPath)) {
      return JSON.parse(fs.readFileSync(localPath, "utf-8"));
    }
    return { cities: [] };
  }
}

async function savePAAData(data: PAAData, message: string): Promise<void> {
  if (useGitHub) {
    await writeJSON(`${DATA_BASE}/paa.json`, data, message);
  } else {
    const localPath = getLocalPath();
    fs.writeFileSync(localPath, JSON.stringify(data, null, 2));
  }
}

/**
 * GET /api/paa?city=slug
 * Get PAA data - all cities or specific city
 */
export async function GET(request: NextRequest) {
  try {
    const citySlug = request.nextUrl.searchParams.get("city");
    const data = await getPAAData();

    if (citySlug) {
      const cityPAA = data.cities.find(c => c.citySlug === citySlug);
      return NextResponse.json(cityPAA || { citySlug, cityName: "", questions: [] });
    }

    // Return summary for all cities
    const summary = data.cities.map(c => ({
      citySlug: c.citySlug,
      cityName: c.cityName,
      questionCount: c.questions.length,
      answeredCount: c.questions.filter(q => q.answered).length,
      lastResearched: c.lastResearched,
      clusters: [...new Set(c.questions.map(q => q.cluster))],
    }));

    return NextResponse.json({ cities: summary });
  } catch (error) {
    console.error("PAA fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch PAA data" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/paa
 * Add questions to a city (manual or from AI research)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { citySlug, cityName, questions, replace } = body;

    if (!citySlug || !questions) {
      return NextResponse.json({ error: "citySlug and questions required" }, { status: 400 });
    }

    const data = await getPAAData();
    let cityIndex = data.cities.findIndex(c => c.citySlug === citySlug);

    if (cityIndex === -1) {
      // Create new city entry
      data.cities.push({
        citySlug,
        cityName: cityName || citySlug,
        questions: [],
      });
      cityIndex = data.cities.length - 1;
    }

    const city = data.cities[cityIndex];

    if (replace) {
      // Replace all questions (for AI research)
      city.questions = questions;
      city.lastResearched = new Date().toISOString();
    } else {
      // Merge questions (for manual adds)
      const existingIds = new Set(city.questions.map(q => q.id));
      const newQuestions = questions.filter((q: PAAQuestion) => !existingIds.has(q.id));
      city.questions.push(...newQuestions);
    }

    if (cityName) city.cityName = cityName;

    await savePAAData(data, `feat(paa): update ${cityName || citySlug} questions [admin]`);

    return NextResponse.json({ success: true, questionCount: city.questions.length });
  } catch (error) {
    console.error("PAA save error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save PAA data" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/paa
 * Update a specific question
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { citySlug, questionId, updates } = body;

    if (!citySlug || !questionId) {
      return NextResponse.json({ error: "citySlug and questionId required" }, { status: 400 });
    }

    const data = await getPAAData();
    const city = data.cities.find(c => c.citySlug === citySlug);

    if (!city) {
      return NextResponse.json({ error: "City not found" }, { status: 404 });
    }

    const question = city.questions.find(q => q.id === questionId);
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    Object.assign(question, updates);
    await savePAAData(data, `feat(paa): update question in ${city.cityName} [admin]`);

    return NextResponse.json({ success: true, question });
  } catch (error) {
    console.error("PAA update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update question" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/paa?city=slug&id=questionId
 * Delete a specific question
 */
export async function DELETE(request: NextRequest) {
  try {
    const citySlug = request.nextUrl.searchParams.get("city");
    const questionId = request.nextUrl.searchParams.get("id");

    if (!citySlug || !questionId) {
      return NextResponse.json({ error: "city and id required" }, { status: 400 });
    }

    const data = await getPAAData();
    const city = data.cities.find(c => c.citySlug === citySlug);

    if (!city) {
      return NextResponse.json({ error: "City not found" }, { status: 404 });
    }

    const index = city.questions.findIndex(q => q.id === questionId);
    if (index === -1) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    city.questions.splice(index, 1);
    await savePAAData(data, `feat(paa): remove question from ${city.cityName} [admin]`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PAA delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete question" },
      { status: 500 }
    );
  }
}
