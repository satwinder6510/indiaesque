import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON } from "@/lib/github";
import type { ContentBank } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ city: string }> }
) {
  try {
    const { city } = await params;
    const contentBank = await readJSON<ContentBank>(
      `india-experiences/data/content-banks/${city}.json`
    );

    if (!contentBank) {
      return NextResponse.json(
        { error: "Content bank not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(contentBank);
  } catch (error) {
    console.error("Error fetching content bank:", error);
    return NextResponse.json(
      { error: "Failed to fetch content bank" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ city: string }> }
) {
  try {
    const { city } = await params;
    const contentBank = (await request.json()) as ContentBank;

    // Update timestamps
    contentBank.updatedAt = new Date().toISOString();

    await writeJSON(
      `india-experiences/data/content-banks/${city}.json`,
      contentBank,
      `feat(content-bank): update ${city} content bank [admin-tool]`
    );

    return NextResponse.json({ success: true, contentBank });
  } catch (error) {
    console.error("Error updating content bank:", error);
    return NextResponse.json(
      { error: "Failed to update content bank" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ city: string }> }
) {
  try {
    const { city } = await params;
    const body = await request.json();

    // Check if content bank already exists
    const existing = await readJSON<ContentBank>(
      `india-experiences/data/content-banks/${city}.json`
    );

    if (existing) {
      return NextResponse.json(
        { error: "Content bank already exists" },
        { status: 400 }
      );
    }

    // Create new content bank
    const contentBank: ContentBank = {
      city,
      cityName: body.cityName || city.charAt(0).toUpperCase() + city.slice(1),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      researchSources: body.researchSources || [],
      categories: body.categories || [],
      pages: body.pages || [],
      notes: body.notes || "",
    };

    await writeJSON(
      `india-experiences/data/content-banks/${city}.json`,
      contentBank,
      `feat(content-bank): create ${city} content bank [admin-tool]`
    );

    return NextResponse.json({ success: true, contentBank });
  } catch (error) {
    console.error("Error creating content bank:", error);
    return NextResponse.json(
      { error: "Failed to create content bank" },
      { status: 500 }
    );
  }
}
