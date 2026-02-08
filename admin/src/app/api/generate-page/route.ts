import { NextRequest, NextResponse } from "next/server";
import { generatePage, assembleMarkdown } from "@/lib/claude";
import { readJSON, writeJSON, writeFile } from "@/lib/github";
import { BANNED_PHRASES } from "@/lib/validator";
import type { ContentBank, AdminState } from "@/lib/types";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { city, pageId } = body;

    if (!city || !pageId) {
      return NextResponse.json(
        { error: "City and pageId are required" },
        { status: 400 }
      );
    }

    // Read content bank
    const contentBank = await readJSON<ContentBank>(
      `india-experiences/data/content-banks/${city}.json`
    );

    if (!contentBank) {
      return NextResponse.json(
        { error: "Content bank not found" },
        { status: 404 }
      );
    }

    // Find the page
    const page = contentBank.pages.find((p) => p.id === pageId);
    if (!page) {
      return NextResponse.json(
        { error: "Page not found in content bank" },
        { status: 404 }
      );
    }

    // Get all page titles/slugs for internal linking context
    const allPages = contentBank.pages.map((p) => ({
      title: p.title,
      slug: p.slug,
    }));

    // Generate content
    const result = await generatePage(
      {
        type: page.type,
        title: page.title,
        slug: page.slug,
        contentDirection: page.contentDirection,
        category: page.category,
      },
      contentBank.cityName,
      city,
      allPages,
      BANNED_PHRASES
    );

    // Assemble markdown
    const markdown = assembleMarkdown(result);

    // Determine file path
    const filePath =
      page.slug === "_index"
        ? `india-experiences/src/content/${city}/_index.md`
        : `india-experiences/src/content/${city}/${page.slug}.md`;

    // Write to GitHub
    const { sha } = await writeFile(
      filePath,
      markdown,
      `feat(content): add ${city}/${page.slug}.md [admin-tool]`
    );

    // Update content bank
    const pageIndex = contentBank.pages.findIndex((p) => p.id === pageId);
    contentBank.pages[pageIndex] = {
      ...page,
      status: "generated",
      wordCount: result.wordCount,
      generatedAt: new Date().toISOString(),
    };
    contentBank.updatedAt = new Date().toISOString();

    await writeJSON(
      `india-experiences/data/content-banks/${city}.json`,
      contentBank,
      `feat(content-bank): update ${pageId} status to generated [admin-tool]`
    );

    // Update admin state
    const adminState = (await readJSON<AdminState>("india-experiences/data/admin-state.json")) || {
      lastUpdated: new Date().toISOString(),
      apiCalls: { research: { total: 0, today: 0 }, generation: { total: 0, today: 0 } },
      currentJob: null,
      jobHistory: [],
    };

    const today = new Date().toISOString().split("T")[0];
    const lastDay = adminState.lastUpdated?.split("T")[0];

    adminState.apiCalls.generation.total += 1;
    adminState.apiCalls.generation.today = lastDay === today ? adminState.apiCalls.generation.today + 1 : 1;
    adminState.lastUpdated = new Date().toISOString();

    await writeJSON(
      "india-experiences/data/admin-state.json",
      adminState,
      `chore: update admin state after generating ${pageId} [admin-tool]`
    );

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    return NextResponse.json({
      status: "success",
      file: filePath,
      wordCount: result.wordCount,
      elapsed: `${elapsed}s`,
      committed: true,
      commitSha: sha,
    });
  } catch (error) {
    console.error("Generate page error:", error);
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Generation failed",
      },
      { status: 500 }
    );
  }
}
