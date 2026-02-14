import { NextRequest, NextResponse } from "next/server";
import { readJSON, listDirectory, writeJSON } from "@/lib/github";

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

// Helper to read cities
async function getCities(): Promise<CityData[]> {
  return await readJSON<CityData[]>(`${DATA_BASE}/cities.json`) || [];
}

// Helper to save cities
async function saveCities(cities: CityData[], message: string): Promise<void> {
  await writeJSON(`${DATA_BASE}/cities.json`, cities, message);
}

/**
 * GET /api/data
 * Returns cities data from JSON with image upload status
 */
export async function GET() {
  try {
    const isUploaded = (p: string) => p.startsWith("/images/");
    const cities = await getCities();

    const uploadedImages = await listDirectory(`${IMAGES_BASE}/cities`);
    const uploadedNames = new Set(uploadedImages.map(f => f.name));

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
 * PUT /api/data
 * Update an existing city
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, name, tier, description } = body;

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    const cities = await getCities();
    const cityIndex = cities.findIndex(c => c.slug === slug);

    if (cityIndex === -1) {
      return NextResponse.json({ error: "City not found" }, { status: 404 });
    }

    // Update fields if provided
    if (name) cities[cityIndex].name = name;
    if (tier) cities[cityIndex].tier = tier;
    if (description !== undefined) cities[cityIndex].description = description;

    await saveCities(cities, `feat(data): update ${cities[cityIndex].name} [admin]`);

    return NextResponse.json({ success: true, city: cities[cityIndex] });
  } catch (error) {
    console.error("Update city error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update city" },
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
