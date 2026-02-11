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

export interface PAAQuestion {
  id: string;
  question: string;
  category: string;
  searchVolume: "high" | "medium" | "low";
  selected: boolean;
  researchedAt: string;
}

export interface ContentVersion {
  id: string;
  content: string;
  wordCount: number;
  createdAt: string;
  source: "ai" | "manual";
  generationConfig?: {
    tone: string;
    wordCount: number;
    keywords: string[];
    paaQuestionIds: string[];
  };
  note?: string;
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

  // Generated content (legacy field - kept for migration)
  generatedContent?: string;

  // PAA Research (persisted)
  paaResearch?: {
    questions: PAAQuestion[];
    lastResearchedAt: string;
  };

  // Content Versioning
  currentVersionId?: string;
  versions: ContentVersion[];

  // Draft
  draft?: {
    content: string;
    lastSavedAt: string;
  };

  // Generation defaults
  generationDefaults?: {
    tone: string;
    wordCount: number;
    keywords: string[];
  };
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
 * Migrate legacy hub to new versioning structure
 */
function migrateHub(hub: CityHub): CityHub {
  // If already migrated, return as-is
  if (hub.versions) {
    return hub;
  }

  // Initialize versions array
  const migratedHub: CityHub = {
    ...hub,
    versions: [],
  };

  // If there's legacy generatedContent, create initial version from it
  if (hub.generatedContent) {
    const initialVersion: ContentVersion = {
      id: generateVersionId(),
      content: hub.generatedContent,
      wordCount: hub.generatedContent.split(/\s+/).filter(w => w).length,
      createdAt: hub.updatedAt || new Date().toISOString(),
      source: "ai",
    };
    migratedHub.versions = [initialVersion];
    migratedHub.currentVersionId = initialVersion.id;
  }

  return migratedHub;
}

/**
 * Generate a unique version ID
 */
function generateVersionId(): string {
  return `v_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * PUT /api/content
 * Update a city hub with action support
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, action = "update", updates, versionId, versionNote } = body;

    if (!slug) {
      return NextResponse.json({ error: "slug required" }, { status: 400 });
    }

    const hubPath = `${CONTENT_BASE}/${slug}/hub.json`;
    let hub = await readJSON<CityHub>(hubPath);

    if (!hub) {
      return NextResponse.json({ error: "City hub not found" }, { status: 404 });
    }

    // Migrate if needed
    hub = migrateHub(hub);

    let commitMessage = `feat(content): update ${hub.name} hub [admin]`;

    switch (action) {
      case "update":
        // Standard update with optional field updates
        hub = { ...hub, ...updates, updatedAt: new Date().toISOString() };
        break;

      case "saveDraft":
        // Save draft content (auto-save)
        if (!updates?.content) {
          return NextResponse.json({ error: "content required for saveDraft" }, { status: 400 });
        }
        hub.draft = {
          content: updates.content,
          lastSavedAt: new Date().toISOString(),
        };
        hub.updatedAt = new Date().toISOString();
        commitMessage = `feat(content): auto-save draft for ${hub.name} [admin]`;
        break;

      case "publishVersion":
        // Publish draft or new content as a version
        const content = updates?.content || hub.draft?.content;
        if (!content) {
          return NextResponse.json({ error: "No content to publish" }, { status: 400 });
        }

        const newVersion: ContentVersion = {
          id: generateVersionId(),
          content,
          wordCount: content.split(/\s+/).filter((w: string) => w).length,
          createdAt: new Date().toISOString(),
          source: updates?.source || "manual",
          generationConfig: updates?.generationConfig,
          note: versionNote,
        };

        // Add to versions (keep max 20)
        hub.versions = [newVersion, ...hub.versions].slice(0, 20);
        hub.currentVersionId = newVersion.id;
        hub.draft = undefined; // Clear draft after publishing
        hub.generatedContent = content; // Keep legacy field in sync
        hub.updatedAt = new Date().toISOString();
        commitMessage = `feat(content): publish new version for ${hub.name} [admin]`;
        break;

      case "revertToVersion":
        // Revert to a specific version
        if (!versionId) {
          return NextResponse.json({ error: "versionId required for revert" }, { status: 400 });
        }

        const targetVersion = hub.versions.find(v => v.id === versionId);
        if (!targetVersion) {
          return NextResponse.json({ error: "Version not found" }, { status: 404 });
        }

        // Create a new version from the reverted content
        const revertedVersion: ContentVersion = {
          id: generateVersionId(),
          content: targetVersion.content,
          wordCount: targetVersion.wordCount,
          createdAt: new Date().toISOString(),
          source: "manual",
          note: `Reverted from version ${versionId}`,
        };

        hub.versions = [revertedVersion, ...hub.versions].slice(0, 20);
        hub.currentVersionId = revertedVersion.id;
        hub.generatedContent = targetVersion.content; // Keep legacy field in sync
        hub.updatedAt = new Date().toISOString();
        commitMessage = `feat(content): revert ${hub.name} to version ${versionId} [admin]`;
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await writeJSON(hubPath, hub, commitMessage);

    return NextResponse.json({ success: true, hub });
  } catch (error) {
    console.error("Content update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update hub" },
      { status: 500 }
    );
  }
}
