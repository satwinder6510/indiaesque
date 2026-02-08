import { NextRequest, NextResponse } from "next/server";
import { readFile, listDirectory, readJSON, writeJSON } from "@/lib/github";
import { validateContent } from "@/lib/validator";
import type { ContentBank, City } from "@/lib/types";

interface CitiesData {
  cities: City[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { city } = body;

    if (!city) {
      return NextResponse.json(
        { error: "City is required" },
        { status: 400 }
      );
    }

    // Get list of valid cities
    const citiesData = await readJSON<CitiesData>("india-experiences/data/cities.json");
    const validCities = citiesData?.cities.map((c) => c.slug) || [];

    // List all files in the city content directory
    const files = await listDirectory(`india-experiences/src/content/${city}`);
    const mdFiles = files.filter((f) => f.name.endsWith(".md"));

    if (mdFiles.length === 0) {
      return NextResponse.json({
        city,
        totalFiles: 0,
        passed: 0,
        failed: 0,
        errors: [],
      });
    }

    // Get all existing page slugs for link validation
    const existingPages = mdFiles.map((f) => {
      const slug = f.name.replace(".md", "");
      if (slug === "_index") {
        return `/${city}/`;
      }
      return `/${city}/${slug}/`;
    });

    // Validate each file
    const errors: {
      file: string;
      errors: { type: string; message?: string; value?: string | number; line?: number }[];
    }[] = [];
    let passed = 0;
    let failed = 0;

    for (const file of mdFiles) {
      const content = await readFile(file.path);
      if (!content) continue;

      const result = validateContent(content, existingPages, validCities);

      if (result.valid) {
        passed++;
      } else {
        failed++;
        errors.push({
          file: file.name,
          errors: result.errors.map((e) => ({
            type: e.type,
            message: e.message,
            value: e.value,
            line: e.line,
          })),
        });
      }
    }

    // Update content bank with validation results
    const contentBank = await readJSON<ContentBank>(
      `india-experiences/data/content-banks/${city}.json`
    );

    if (contentBank) {
      let needsFixCount = 0;
      let validatedCount = 0;

      for (const page of contentBank.pages) {
        const fileName =
          page.slug === "_index" ? "_index.md" : `${page.slug}.md`;
        const fileErrors = errors.find((e) => e.file === fileName);

        if (fileErrors && fileErrors.errors.length > 0) {
          page.status = "needs-fix";
          page.validationErrors = fileErrors.errors.map((e) => e.type);
          needsFixCount++;
        } else if (page.status === "generated" || page.status === "needs-fix" || page.status === "validation-failed") {
          page.status = "validated";
          page.validationErrors = [];
          validatedCount++;
        }
      }

      contentBank.updatedAt = new Date().toISOString();

      // Save updated content bank
      await writeJSON(
        `india-experiences/data/content-banks/${city}.json`,
        contentBank,
        `chore: update validation status for ${city} - ${validatedCount} validated, ${needsFixCount} need fix [admin-tool]`
      );
    }

    return NextResponse.json({
      city,
      totalFiles: mdFiles.length,
      passed,
      failed,
      errors,
    });
  } catch (error) {
    console.error("Validation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Validation failed" },
      { status: 500 }
    );
  }
}
