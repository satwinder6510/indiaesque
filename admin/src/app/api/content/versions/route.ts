import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON } from "@/lib/github";
import type { CityHub } from "../route";

const CONTENT_BASE = "india-experiences/src/data/content";

/**
 * GET /api/content/versions?city=slug&version=versionId
 * Retrieve a specific version's content
 */
export async function GET(request: NextRequest) {
  try {
    const citySlug = request.nextUrl.searchParams.get("city");
    const versionId = request.nextUrl.searchParams.get("version");

    if (!citySlug) {
      return NextResponse.json({ error: "city slug required" }, { status: 400 });
    }

    const hubPath = `${CONTENT_BASE}/${citySlug}/hub.json`;
    const hub = await readJSON<CityHub>(hubPath);

    if (!hub) {
      return NextResponse.json({ error: "City hub not found" }, { status: 404 });
    }

    if (!hub.versions || hub.versions.length === 0) {
      return NextResponse.json({ error: "No versions found" }, { status: 404 });
    }

    // If specific version requested
    if (versionId) {
      const version = hub.versions.find(v => v.id === versionId);
      if (!version) {
        return NextResponse.json({ error: "Version not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, version });
    }

    // Return all versions (metadata only, no content for performance)
    const versionSummaries = hub.versions.map(v => ({
      id: v.id,
      wordCount: v.wordCount,
      createdAt: v.createdAt,
      source: v.source,
      note: v.note,
    }));

    return NextResponse.json({
      success: true,
      versions: versionSummaries,
      currentVersionId: hub.currentVersionId,
    });
  } catch (error) {
    console.error("Version fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch version" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/content/versions?city=slug&version=versionId
 * Remove a specific version (cannot delete current version)
 */
export async function DELETE(request: NextRequest) {
  try {
    const citySlug = request.nextUrl.searchParams.get("city");
    const versionId = request.nextUrl.searchParams.get("version");

    if (!citySlug || !versionId) {
      return NextResponse.json({ error: "city slug and version id required" }, { status: 400 });
    }

    const hubPath = `${CONTENT_BASE}/${citySlug}/hub.json`;
    const hub = await readJSON<CityHub>(hubPath);

    if (!hub) {
      return NextResponse.json({ error: "City hub not found" }, { status: 404 });
    }

    if (!hub.versions || hub.versions.length === 0) {
      return NextResponse.json({ error: "No versions found" }, { status: 404 });
    }

    // Cannot delete current version
    if (hub.currentVersionId === versionId) {
      return NextResponse.json(
        { error: "Cannot delete current version. Publish a new version first." },
        { status: 400 }
      );
    }

    const versionIndex = hub.versions.findIndex(v => v.id === versionId);
    if (versionIndex === -1) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    // Remove the version
    hub.versions.splice(versionIndex, 1);
    hub.updatedAt = new Date().toISOString();

    await writeJSON(hubPath, hub, `feat(content): delete version ${versionId} for ${hub.name} [admin]`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Version delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete version" },
      { status: 500 }
    );
  }
}
