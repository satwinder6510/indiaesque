import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const INDIA_EXPERIENCES_PATH = path.join(process.cwd(), "..", "india-experiences");
const CONTENT_PATH = path.join(INDIA_EXPERIENCES_PATH, "src", "content");

export async function GET(
  request: Request,
  { params }: { params: Promise<{ city: string; slug: string }> }
) {
  try {
    const { city, slug } = await params;
    const filePath = path.join(CONTENT_PATH, city, `${slug}.md`);

    const content = await fs.readFile(filePath, "utf-8");

    // Parse frontmatter and content
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (!frontmatterMatch) {
      return NextResponse.json({ error: "Invalid markdown format" }, { status: 400 });
    }

    const frontmatterRaw = frontmatterMatch[1];
    const body = frontmatterMatch[2];

    // Parse YAML frontmatter (simple parsing)
    const frontmatter: Record<string, unknown> = {};
    let currentKey = "";
    let currentValue: unknown = "";
    let inArray = false;
    let arrayItems: string[] = [];

    for (const line of frontmatterRaw.split("\n")) {
      if (line.match(/^(\w+):\s*$/)) {
        // Start of array
        if (currentKey && inArray) {
          frontmatter[currentKey] = arrayItems;
          arrayItems = [];
        }
        currentKey = line.match(/^(\w+):/)?.[1] || "";
        inArray = true;
      } else if (line.match(/^\s+-\s+/)) {
        // Array item
        const item = line.replace(/^\s+-\s+/, "").replace(/^["']|["']$/g, "");
        arrayItems.push(item);
      } else if (line.match(/^(\w+):\s*.+/)) {
        // Key-value pair
        if (currentKey && inArray) {
          frontmatter[currentKey] = arrayItems;
          arrayItems = [];
          inArray = false;
        }
        const match = line.match(/^(\w+):\s*(.+)/);
        if (match) {
          let value: unknown = match[2].replace(/^["']|["']$/g, "");
          // Parse booleans and numbers
          if (value === "true") value = true;
          else if (value === "false") value = false;
          else if (!isNaN(Number(value)) && value !== "") value = Number(value);
          frontmatter[match[1]] = value;
        }
      }
    }

    if (currentKey && inArray) {
      frontmatter[currentKey] = arrayItems;
    }

    return NextResponse.json({
      frontmatter,
      content: body.trim(),
      raw: content,
    });
  } catch (error) {
    console.error("Error reading page:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to read page" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ city: string; slug: string }> }
) {
  try {
    const { city, slug } = await params;
    const filePath = path.join(CONTENT_PATH, city, `${slug}.md`);

    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Validate that content has frontmatter
    if (!content.startsWith("---")) {
      return NextResponse.json({ error: "Content must start with frontmatter (---)" }, { status: 400 });
    }

    // Update dateModified in frontmatter
    const today = new Date().toISOString().split("T")[0];
    const updatedContent = content.replace(
      /dateModified:\s*["']?\d{4}-\d{2}-\d{2}["']?/,
      `dateModified: "${today}"`
    );

    await fs.writeFile(filePath, updatedContent, "utf-8");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving page:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save page" },
      { status: 500 }
    );
  }
}
