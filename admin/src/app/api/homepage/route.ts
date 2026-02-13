import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON } from "@/lib/github";
import fs from "fs";
import path from "path";

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

// Check if we have GitHub credentials
const useGitHub = !!(process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO);

// Helper to get local path
const getLocalPath = () => path.join(process.cwd(), "..", "india-experiences", "src", "data", "homepage.json");

// Helper to read homepage data
async function getHomepage(): Promise<HomepageData | null> {
  if (useGitHub) {
    return await readJSON<HomepageData>(DATA_PATH);
  } else {
    const localPath = getLocalPath();
    if (fs.existsSync(localPath)) {
      return JSON.parse(fs.readFileSync(localPath, "utf-8"));
    }
    return null;
  }
}

// Helper to save homepage data
async function saveHomepage(data: HomepageData, message: string): Promise<void> {
  if (useGitHub) {
    await writeJSON(DATA_PATH, data, message);
  } else {
    const localPath = getLocalPath();
    fs.writeFileSync(localPath, JSON.stringify(data, null, 2));
  }
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
