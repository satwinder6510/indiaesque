import { NextRequest, NextResponse } from "next/server";
import { readJSON, listDirectory, writeJSON } from "@/lib/github";
import fs from "fs";
import path from "path";

const DATA_BASE = "india-experiences/src/data";
const IMAGES_BASE = "india-experiences/public/images";

interface CityData {
  name: string;
  slug: string;
  tier: number;
  lat: string;
  lng: string;
  description: string;
  heroImage: string;
  cardImage: string;
  bestMonths: number[];
  goodMonths: number[];
}

// Check if we have GitHub credentials
const useGitHub = !!(process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO);

// Helper to get local path
const getLocalPath = () => path.join(process.cwd(), "..", "india-experiences", "src", "data", "cities.json");

// Helper to read cities
async function getCities(): Promise<CityData[]> {
  if (useGitHub) {
    return await readJSON<CityData[]>(`${DATA_BASE}/cities.json`) || [];
  } else {
    const localPath = getLocalPath();
    if (fs.existsSync(localPath)) {
      return JSON.parse(fs.readFileSync(localPath, "utf-8"));
    }
    return [];
  }
}

// Helper to save cities
async function saveCities(cities: CityData[], message: string): Promise<void> {
  if (useGitHub) {
    await writeJSON(`${DATA_BASE}/cities.json`, cities, message);
  } else {
    const localPath = getLocalPath();
    fs.writeFileSync(localPath, JSON.stringify(cities, null, 2));
  }
}

/**
 * GET /api/data
 * Returns cities data from JSON with image upload status
 */
export async function GET() {
  try {
    const isUploaded = (p: string) => p.startsWith("/images/");
    const cities = await getCities();

    let uploadedNames = new Set<string>();
    if (useGitHub) {
      const uploadedImages = await listDirectory(`${IMAGES_BASE}/cities`);
      uploadedNames = new Set(uploadedImages.map(f => f.name));
    } else {
      const imagesPath = path.join(process.cwd(), "..", "india-experiences", "public", "images", "cities");
      if (fs.existsSync(imagesPath)) {
        uploadedNames = new Set(fs.readdirSync(imagesPath));
      }
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

/**
 * POST /api/data
 * Add a new city
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, tier, lat, lng, description } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const cities = await getCities();

    // Check if slug already exists
    if (cities.some(c => c.slug === slug)) {
      return NextResponse.json({ error: "City already exists" }, { status: 400 });
    }

    const newCity: CityData = {
      name,
      slug,
      tier: tier || 2,
      lat: lat || "0",
      lng: lng || "0",
      description: description || "",
      heroImage: "",
      cardImage: "",
      bestMonths: [],
      goodMonths: [],
    };

    cities.push(newCity);
    await saveCities(cities, `feat(data): add ${name} [admin]`);

    return NextResponse.json({ success: true, city: newCity });
  } catch (error) {
    console.error("Add city error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add city" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/data?slug=city-slug
 * Remove a city
 */
export async function DELETE(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    const cities = await getCities();
    const cityIndex = cities.findIndex(c => c.slug === slug);

    if (cityIndex === -1) {
      return NextResponse.json({ error: "City not found" }, { status: 404 });
    }

    const cityName = cities[cityIndex].name;
    cities.splice(cityIndex, 1);
    await saveCities(cities, `feat(data): remove ${cityName} [admin]`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete city error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete city" },
      { status: 500 }
    );
  }
}
