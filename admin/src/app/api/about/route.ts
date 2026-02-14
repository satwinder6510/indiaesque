import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON } from "@/lib/github";

const DATA_PATH = "india-experiences/src/data/about.json";

interface Highlight {
  title: string;
  description: string;
}

interface Section {
  id: string;
  title: string;
  content?: string;
  highlights?: Highlight[];
}

interface AboutData {
  hero: {
    location: string;
    title: string;
    subtitle: string;
  };
  sections: Section[];
  contact: {
    email: string;
    phone: string;
    address: string;
  };
}

// Helper to read about data
async function getAbout(): Promise<AboutData | null> {
  return await readJSON<AboutData>(DATA_PATH);
}

// Helper to save about data
async function saveAbout(data: AboutData, message: string): Promise<void> {
  await writeJSON(DATA_PATH, data, message);
}

/**
 * GET /api/about
 * Returns about page data
 */
export async function GET() {
  try {
    const data = await getAbout();

    if (!data) {
      return NextResponse.json({ error: "About data not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("About fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch about data" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/about
 * Update about page data
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { hero, sections, contact } = body;

    const currentData = await getAbout();

    if (!currentData) {
      return NextResponse.json({ error: "About data not found" }, { status: 404 });
    }

    // Update fields if provided
    const updatedData: AboutData = {
      hero: hero || currentData.hero,
      sections: sections || currentData.sections,
      contact: contact || currentData.contact,
    };

    await saveAbout(updatedData, "feat(about): update about page content [admin]");

    return NextResponse.json({ success: true, data: updatedData });
  } catch (error) {
    console.error("About update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update about page" },
      { status: 500 }
    );
  }
}
