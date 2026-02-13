import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const INDIA_EXPERIENCES_PATH = path.join(process.cwd(), "..", "india-experiences");
const CONTENT_PATH = path.join(INDIA_EXPERIENCES_PATH, "src", "content");

interface PageInfo {
  slug: string;
  title: string;
  description: string;
  tier: string;
  category: string;
  type: string;
  status: string;
  priority: number;
  wordCount: number;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ city: string }> }
) {
  try {
    const { city } = await params;
    const cityPath = path.join(CONTENT_PATH, city);

    // Check if directory exists
    try {
      await fs.access(cityPath);
    } catch {
      return NextResponse.json({ pages: [] });
    }

    const files = await fs.readdir(cityPath);
    const mdFiles = files.filter((f) => f.endsWith(".md"));

    const pages: PageInfo[] = [];

    for (const file of mdFiles) {
      const filePath = path.join(cityPath, file);
      const content = await fs.readFile(filePath, "utf-8");

      // Parse frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (!frontmatterMatch) continue;

      const frontmatterRaw = frontmatterMatch[1];
      const body = frontmatterMatch[2];

      // Simple frontmatter parsing
      const getValue = (key: string): string => {
        const match = frontmatterRaw.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?`, "m"));
        return match ? match[1].trim() : "";
      };

      const wordCount = body.split(/\s+/).filter((w) => w.length > 0).length;

      pages.push({
        slug: file.replace(".md", ""),
        title: getValue("title"),
        description: getValue("description"),
        tier: getValue("tier") || "3",
        category: getValue("category") || "",
        type: getValue("type") || "paa",
        status: getValue("status") || "machine-draft",
        priority: parseInt(getValue("priority")) || 5,
        wordCount,
      });
    }

    // Sort by priority (high first), then by title
    pages.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.title.localeCompare(b.title);
    });

    return NextResponse.json({ pages });
  } catch (error) {
    console.error("Error listing pages:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list pages" },
      { status: 500 }
    );
  }
}
