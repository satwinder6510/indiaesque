import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON } from "@/lib/github";
import type { ContentBank, ContentBankPage } from "@/lib/types";

// Add a new page to the content bank
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ city: string }> }
) {
  try {
    const { city } = await params;
    const newPage = (await request.json()) as ContentBankPage;

    const contentBank = await readJSON<ContentBank>(
      `data/content-banks/${city}.json`
    );

    if (!contentBank) {
      return NextResponse.json(
        { error: "Content bank not found" },
        { status: 404 }
      );
    }

    // Check for duplicate ID or slug
    if (contentBank.pages.some((p) => p.id === newPage.id || p.slug === newPage.slug)) {
      return NextResponse.json(
        { error: "Page with this ID or slug already exists" },
        { status: 400 }
      );
    }

    // Set default values
    const pageToAdd: ContentBankPage = {
      id: newPage.id || `${city}-${newPage.slug}`,
      type: newPage.type || "paa",
      category: newPage.category || "general",
      title: newPage.title,
      slug: newPage.slug,
      contentDirection: newPage.contentDirection || "",
      status: "not-started",
      wordCount: null,
      generatedAt: null,
      validationErrors: [],
    };

    contentBank.pages.push(pageToAdd);
    contentBank.updatedAt = new Date().toISOString();

    await writeJSON(
      `data/content-banks/${city}.json`,
      contentBank,
      `feat(content-bank): add page ${pageToAdd.slug} to ${city} [admin-tool]`
    );

    return NextResponse.json({ success: true, page: pageToAdd });
  } catch (error) {
    console.error("Error adding page:", error);
    return NextResponse.json(
      { error: "Failed to add page" },
      { status: 500 }
    );
  }
}

// Update an existing page
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ city: string }> }
) {
  try {
    const { city } = await params;
    const { pageId, updates } = await request.json();

    const contentBank = await readJSON<ContentBank>(
      `data/content-banks/${city}.json`
    );

    if (!contentBank) {
      return NextResponse.json(
        { error: "Content bank not found" },
        { status: 404 }
      );
    }

    const pageIndex = contentBank.pages.findIndex((p) => p.id === pageId);
    if (pageIndex === -1) {
      return NextResponse.json(
        { error: "Page not found" },
        { status: 404 }
      );
    }

    // Apply updates
    contentBank.pages[pageIndex] = {
      ...contentBank.pages[pageIndex],
      ...updates,
    };
    contentBank.updatedAt = new Date().toISOString();

    await writeJSON(
      `data/content-banks/${city}.json`,
      contentBank,
      `feat(content-bank): update page ${pageId} in ${city} [admin-tool]`
    );

    return NextResponse.json({
      success: true,
      page: contentBank.pages[pageIndex],
    });
  } catch (error) {
    console.error("Error updating page:", error);
    return NextResponse.json(
      { error: "Failed to update page" },
      { status: 500 }
    );
  }
}

// Delete a page
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ city: string }> }
) {
  try {
    const { city } = await params;
    const { pageId } = await request.json();

    const contentBank = await readJSON<ContentBank>(
      `data/content-banks/${city}.json`
    );

    if (!contentBank) {
      return NextResponse.json(
        { error: "Content bank not found" },
        { status: 404 }
      );
    }

    const pageIndex = contentBank.pages.findIndex((p) => p.id === pageId);
    if (pageIndex === -1) {
      return NextResponse.json(
        { error: "Page not found" },
        { status: 404 }
      );
    }

    const deletedPage = contentBank.pages.splice(pageIndex, 1)[0];
    contentBank.updatedAt = new Date().toISOString();

    await writeJSON(
      `data/content-banks/${city}.json`,
      contentBank,
      `feat(content-bank): remove page ${pageId} from ${city} [admin-tool]`
    );

    return NextResponse.json({ success: true, deletedPage });
  } catch (error) {
    console.error("Error deleting page:", error);
    return NextResponse.json(
      { error: "Failed to delete page" },
      { status: 500 }
    );
  }
}
