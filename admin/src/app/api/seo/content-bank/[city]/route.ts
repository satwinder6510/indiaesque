import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const INDIA_EXPERIENCES_PATH = path.join(process.cwd(), "..", "india-experiences");
const CONTENT_BANKS_PATH = path.join(INDIA_EXPERIENCES_PATH, "data", "content-banks");
const CONTENT_PATH = path.join(INDIA_EXPERIENCES_PATH, "src", "content");

export async function GET(
  request: Request,
  { params }: { params: Promise<{ city: string }> }
) {
  try {
    const { city } = await params;
    const contentBankPath = path.join(CONTENT_BANKS_PATH, `${city}.json`);

    // Read content bank
    const data = JSON.parse(await fs.readFile(contentBankPath, "utf-8"));

    // Get list of generated files
    const cityContentPath = path.join(CONTENT_PATH, city);
    let generatedFiles: string[] = [];
    try {
      const files = await fs.readdir(cityContentPath);
      generatedFiles = files
        .filter((f) => f.endsWith(".md"))
        .map((f) => f.replace(".md", ""));
    } catch {
      // No content directory yet
    }

    // Mark pages as generated if file exists
    const pages = (data.pages || []).map((page: { slug: string; status?: string }) => ({
      ...page,
      status: generatedFiles.includes(page.slug) ? "generated" : page.status || "pending",
    }));

    return NextResponse.json({ pages });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed to load content bank" }, { status: 500 });
  }
}
