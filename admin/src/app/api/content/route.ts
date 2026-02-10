import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON, listDirectory } from "@/lib/github";

const CONTENT_BASE = "india-experiences/src/data/content";

export interface HubSection {
  id: string;
  title: string;
  content: string;
}

export interface ViatorConfig {
  destinationId: number;
  tagIds?: number[];
  enabled: boolean;
}

export interface CityHub {
  slug: string;
  name: string;
  title: string;
  description: string;
  sections: HubSection[];
  viator: ViatorConfig;
  createdAt: string;
  updatedAt: string;
}

export interface SubPage {
  slug: string;
  citySlug: string;
  title: string;
  type: "area-guide" | "itinerary" | "topic" | "attraction";
  description: string;
  content: string;
  viator?: ViatorConfig;
  relatedPages: string[];
  createdAt: string;
  updatedAt: string;
}

async function getCityHubs(): Promise<{ slug: string; name: string; pageCount: number }[]> {
  const cities: { slug: string; name: string; pageCount: number }[] = [];

  try {
    const dirs = await listDirectory(CONTENT_BASE);

    for (const dir of dirs) {
      if (dir.type === "dir") {
        const hubPath = `${CONTENT_BASE}/${dir.name}/hub.json`;
        const hub = await readJSON<CityHub>(hubPath);

        if (hub) {
          // Count pages
          let pageCount = 0;
          try {
            const pagesDir = await listDirectory(`${CONTENT_BASE}/${dir.name}/pages`);
            pageCount = pagesDir.filter(f => f.name.endsWith(".json")).length;
          } catch {
            // Pages dir might not exist
          }
          cities.push({ slug: hub.slug, name: hub.name, pageCount });
        }
      }
    }
  } catch {
    // Content base might not exist yet
  }

  return cities;
}

async function getCityHub(citySlug: string): Promise<CityHub | null> {
  const hubPath = `${CONTENT_BASE}/${citySlug}/hub.json`;
  return await readJSON<CityHub>(hubPath);
}

async function getSubPages(citySlug: string): Promise<SubPage[]> {
  const pages: SubPage[] = [];

  try {
    const pagesDir = await listDirectory(`${CONTENT_BASE}/${citySlug}/pages`);
    const jsonFiles = pagesDir.filter(f => f.name.endsWith(".json"));

    for (const file of jsonFiles) {
      const page = await readJSON<SubPage>(`${CONTENT_BASE}/${citySlug}/pages/${file.name}`);
      if (page) pages.push(page);
    }
  } catch {
    // Pages dir might not exist
  }

  return pages;
}

/**
 * GET /api/content?city=slug
 * Get all city hubs or specific city with its pages
 */
export async function GET(request: NextRequest) {
  try {
    const citySlug = request.nextUrl.searchParams.get("city");

    if (citySlug) {
      const hub = await getCityHub(citySlug);
      if (!hub) {
        return NextResponse.json({ error: "City not found" }, { status: 404 });
      }
      const pages = await getSubPages(citySlug);
      return NextResponse.json({ hub, pages });
    }

    const cities = await getCityHubs();
    return NextResponse.json({ cities });
  } catch (error) {
    console.error("Content fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch content" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/content
 * Create a new city hub
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, name } = body;

    if (!slug || !name) {
      return NextResponse.json({ error: "slug and name required" }, { status: 400 });
    }

    const hubPath = `${CONTENT_BASE}/${slug}/hub.json`;
    const existing = await readJSON<CityHub>(hubPath);

    if (existing) {
      return NextResponse.json({ error: "City hub already exists" }, { status: 409 });
    }

    const hub: CityHub = {
      slug,
      name,
      title: `${name} Travel Guide`,
      description: `Complete guide to exploring ${name}`,
      sections: [
        { id: "intro", title: "Introduction", content: "" },
        { id: "getting-there", title: "Getting There", content: "" },
        { id: "areas", title: "Where to Stay", content: "" },
        { id: "highlights", title: "Must-See Highlights", content: "" }
      ],
      viator: {
        destinationId: 0,
        enabled: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await writeJSON(hubPath, hub, `feat(content): create ${name} hub [admin]`);

    return NextResponse.json({ success: true, hub });
  } catch (error) {
    console.error("Content create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create hub" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/content
 * Update a city hub
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, updates } = body;

    if (!slug) {
      return NextResponse.json({ error: "slug required" }, { status: 400 });
    }

    const hubPath = `${CONTENT_BASE}/${slug}/hub.json`;
    const hub = await readJSON<CityHub>(hubPath);

    if (!hub) {
      return NextResponse.json({ error: "City hub not found" }, { status: 404 });
    }

    const updatedHub = { ...hub, ...updates, updatedAt: new Date().toISOString() };
    await writeJSON(hubPath, updatedHub, `feat(content): update ${hub.name} hub [admin]`);

    return NextResponse.json({ success: true, hub: updatedHub });
  } catch (error) {
    console.error("Content update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update hub" },
      { status: 500 }
    );
  }
}
