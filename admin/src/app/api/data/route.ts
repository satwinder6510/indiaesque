import { NextResponse } from "next/server";
import { readJSON, listDirectory } from "@/lib/github";
import fs from "fs";
import path from "path";

const DATA_BASE = "india-experiences/src/data";
const IMAGES_BASE = "india-experiences/public/images";

interface CityData {
  name: string;
  slug: string;
  heroImage: string;
  cardImage: string;
  [key: string]: unknown;
}

// Check if we have GitHub credentials
const useGitHub = !!(process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO);

/**
 * GET /api/data
 * Returns cities data from JSON with image upload status
 */
export async function GET() {
  try {
    const isUploaded = (p: string) => p.startsWith("/images/");

    let cities: CityData[] | null = null;
    let uploadedNames = new Set<string>();

    if (useGitHub) {
      // Production: read from GitHub
      cities = await readJSON<CityData[]>(`${DATA_BASE}/cities.json`);
      const uploadedImages = await listDirectory(`${IMAGES_BASE}/cities`);
      uploadedNames = new Set(uploadedImages.map(f => f.name));
    } else {
      // Local dev: read from filesystem
      const localPath = path.join(process.cwd(), "..", "india-experiences", "src", "data", "cities.json");
      const imagesPath = path.join(process.cwd(), "..", "india-experiences", "public", "images", "cities");

      if (fs.existsSync(localPath)) {
        const content = fs.readFileSync(localPath, "utf-8");
        cities = JSON.parse(content);
      }

      if (fs.existsSync(imagesPath)) {
        const files = fs.readdirSync(imagesPath);
        uploadedNames = new Set(files);
      }
    }

    if (!cities) {
      return NextResponse.json({ cities: [] });
    }

    const citiesWithStatus = cities.map(city => ({
      ...city,
      images: {
        hero: {
          uploaded: isUploaded(city.heroImage),
          exists: uploadedNames.has(`${city.slug}-hero.jpg`),
        },
        card: {
          uploaded: isUploaded(city.cardImage),
          exists: uploadedNames.has(`${city.slug}-card.jpg`),
        },
      },
    }));

    return NextResponse.json({ cities: citiesWithStatus });
  } catch (error) {
    console.error("Data fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch data" },
      { status: 500 }
    );
  }
}
