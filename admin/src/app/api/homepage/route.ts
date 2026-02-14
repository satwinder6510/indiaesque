import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON } from "@/lib/github";

const DATA_PATH = "india-experiences/src/data/homepage.json";

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface HomepageData {
  hero: {
    location: string;
    title: string;
  };
  intro: {
    paragraphs: string[];
  };
  features: Feature[];
}

// Helper to read homepage data
async function getHomepage(): Promise<HomepageData | null> {
  return await readJSON<HomepageData>(DATA_PATH);
}

// Helper to save homepage data
async function saveHomepage(data: HomepageData, message: string): Promise<void> {
  await writeJSON(DATA_PATH, data, message);
}

/**
 * GET /api/homepage
 * Returns homepage data
 */
export async function GET() {
  try {
    const data = await getHomepage();

    if (!data) {
      return NextResponse.json({ error: "Homepage data not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Homepage fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch homepage data" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/homepage
 * Update homepage data
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { hero, intro, features } = body;

    const currentData = await getHomepage();

    if (!currentData) {
      return NextResponse.json({ error: "Homepage data not found" }, { status: 404 });
    }

    // Update fields if provided
    const updatedData: HomepageData = {
      hero: hero || currentData.hero,
      intro: intro || currentData.intro,
      features: features || currentData.features,
    };

    await saveHomepage(updatedData, "feat(homepage): update homepage content [admin]");

    return NextResponse.json({ success: true, data: updatedData });
  } catch (error) {
    console.error("Homepage update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update homepage" },
      { status: 500 }
    );
  }
}
