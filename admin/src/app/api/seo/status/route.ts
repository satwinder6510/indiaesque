import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const INDIA_EXPERIENCES_PATH = path.join(process.cwd(), "..", "india-experiences");
const CONTENT_BANKS_PATH = path.join(INDIA_EXPERIENCES_PATH, "data", "content-banks");
const CONTENT_PATH = path.join(INDIA_EXPERIENCES_PATH, "src", "content");

const CITIES = ["delhi", "mumbai", "jaipur", "kolkata"];

export async function GET() {
  try {
    const cities = await Promise.all(
      CITIES.map(async (slug) => {
        const name = slug.charAt(0).toUpperCase() + slug.slice(1);

        // Check if content bank exists
        const contentBankPath = path.join(CONTENT_BANKS_PATH, `${slug}.json`);
        let contentBank = false;
        let total = 0;

        try {
          await fs.access(contentBankPath);
          contentBank = true;
          const data = JSON.parse(await fs.readFile(contentBankPath, "utf-8"));
          total = data.pages?.length || 0;
        } catch {
          // Content bank doesn't exist
        }

        // Count generated files
        let generated = 0;
        try {
          const cityContentPath = path.join(CONTENT_PATH, slug);
          const files = await fs.readdir(cityContentPath);
          generated = files.filter((f) => f.endsWith(".md")).length;
        } catch {
          // No content directory
        }

        return { slug, name, contentBank, generated, total };
      })
    );

    return NextResponse.json({ cities });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed to load status" }, { status: 500 });
  }
}
