import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CONTENT_BASE = path.join(process.cwd(), "..", "india-experiences", "src", "data", "content");

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

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getCityHubs(): { slug: string; name: string; pageCount: number }[] {
  ensureDir(CONTENT_BASE);
  const cities: { slug: string; name: string; pageCount: number }[] = [];

  if (!fs.existsSync(CONTENT_BASE)) return cities;

  const dirs = fs.readdirSync(CONTENT_BASE, { withFileTypes: true });
  for (const dir of dirs) {
    if (dir.isDirectory()) {
      const hubPath = path.join(CONTENT_BASE, dir.name, "hub.json");
      if (fs.existsSync(hubPath)) {
        const hub = JSON.parse(fs.readFileSync(hubPath, "utf-8")) as CityHub;
        const pagesDir = path.join(CONTENT_BASE, dir.name, "pages");
        let pageCount = 0;
        if (fs.existsSync(pagesDir)) {
          pageCount = fs.readdirSync(pagesDir).filter(f => f.endsWith(".json")).length;
        }
        cities.push({ slug: hub.slug, name: hub.name, pageCount });
      }
    }
  }
  return cities;
}

function getCityHub(citySlug: string): CityHub | null {
  const hubPath = path.join(CONTENT_BASE, citySlug, "hub.json");
  if (!fs.existsSync(hubPath)) return null;
  return JSON.parse(fs.readFileSync(hubPath, "utf-8"));
}

function getSubPages(citySlug: string): SubPage[] {
  const pagesDir = path.join(CONTENT_BASE, citySlug, "pages");
  if (!fs.existsSync(pagesDir)) return [];

  const pages: SubPage[] = [];
  const files = fs.readdirSync(pagesDir).filter(f => f.endsWith(".json"));
  for (const file of files) {
    const page = JSON.parse(fs.readFileSync(path.join(pagesDir, file), "utf-8"));
    pages.push(page);
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
      const hub = getCityHub(citySlug);
      if (!hub) {
        return NextResponse.json({ error: "City not found" }, { status: 404 });
      }
      const pages = getSubPages(citySlug);
      return NextResponse.json({ hub, pages });
    }

    const cities = getCityHubs();
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

    const cityDir = path.join(CONTENT_BASE, slug);
    const hubPath = path.join(cityDir, "hub.json");

    if (fs.existsSync(hubPath)) {
      return NextResponse.json({ error: "City hub already exists" }, { status: 409 });
    }

    ensureDir(cityDir);
    ensureDir(path.join(cityDir, "pages"));

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

    fs.writeFileSync(hubPath, JSON.stringify(hub, null, 2));

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

    const hubPath = path.join(CONTENT_BASE, slug, "hub.json");
    if (!fs.existsSync(hubPath)) {
      return NextResponse.json({ error: "City hub not found" }, { status: 404 });
    }

    const hub = JSON.parse(fs.readFileSync(hubPath, "utf-8")) as CityHub;
    Object.assign(hub, updates, { updatedAt: new Date().toISOString() });

    fs.writeFileSync(hubPath, JSON.stringify(hub, null, 2));

    return NextResponse.json({ success: true, hub });
  } catch (error) {
    console.error("Content update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update hub" },
      { status: 500 }
    );
  }
}
