import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON, deleteFile } from "@/lib/github";

const CONTENT_BASE = "india-experiences/src/data/content";

export interface ViatorConfig {
  destinationId: number;
  tagIds?: number[];
  enabled: boolean;
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

interface CityHub {
  viator?: ViatorConfig;
}

/**
 * GET /api/content/pages?city=slug&page=slug
 * Get a specific sub-page
 */
export async function GET(request: NextRequest) {
  try {
    const citySlug = request.nextUrl.searchParams.get("city");
    const pageSlug = request.nextUrl.searchParams.get("page");

    if (!citySlug || !pageSlug) {
      return NextResponse.json({ error: "city and page required" }, { status: 400 });
    }

    const pagePath = `${CONTENT_BASE}/${citySlug}/pages/${pageSlug}.json`;
    const page = await readJSON<SubPage>(pagePath);

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json({ page });
  } catch (error) {
    console.error("Page fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch page" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/content/pages
 * Create a new sub-page
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { citySlug, slug, title, type } = body;

    if (!citySlug || !slug || !title || !type) {
      return NextResponse.json({ error: "citySlug, slug, title, and type required" }, { status: 400 });
    }

    const pagePath = `${CONTENT_BASE}/${citySlug}/pages/${slug}.json`;
    const existing = await readJSON<SubPage>(pagePath);

    if (existing) {
      return NextResponse.json({ error: "Page already exists" }, { status: 409 });
    }

    // Get hub's viator config as default
    const hubPath = `${CONTENT_BASE}/${citySlug}/hub.json`;
    const hub = await readJSON<CityHub>(hubPath);
    const destinationId = hub?.viator?.destinationId || 0;

    const page: SubPage = {
      slug,
      citySlug,
      title,
      type,
      description: "",
      content: "",
      viator: {
        destinationId,
        tagIds: [],
        enabled: false
      },
      relatedPages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await writeJSON(pagePath, page, `feat(content): create ${title} page [admin]`);

    return NextResponse.json({ success: true, page });
  } catch (error) {
    console.error("Page create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create page" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/content/pages
 * Update a sub-page
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { citySlug, slug, updates } = body;

    if (!citySlug || !slug) {
      return NextResponse.json({ error: "citySlug and slug required" }, { status: 400 });
    }

    const pagePath = `${CONTENT_BASE}/${citySlug}/pages/${slug}.json`;
    const page = await readJSON<SubPage>(pagePath);

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const updatedPage = { ...page, ...updates, updatedAt: new Date().toISOString() };
    await writeJSON(pagePath, updatedPage, `feat(content): update ${page.title} [admin]`);

    return NextResponse.json({ success: true, page: updatedPage });
  } catch (error) {
    console.error("Page update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update page" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/content/pages?city=slug&page=slug
 * Delete a sub-page
 */
export async function DELETE(request: NextRequest) {
  try {
    const citySlug = request.nextUrl.searchParams.get("city");
    const pageSlug = request.nextUrl.searchParams.get("page");

    if (!citySlug || !pageSlug) {
      return NextResponse.json({ error: "city and page required" }, { status: 400 });
    }

    const pagePath = `${CONTENT_BASE}/${citySlug}/pages/${pageSlug}.json`;
    const deleted = await deleteFile(pagePath, `feat(content): delete ${pageSlug} page [admin]`);

    if (!deleted) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Page delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete page" },
      { status: 500 }
    );
  }
}
