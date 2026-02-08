import { NextRequest, NextResponse } from "next/server";
import { listDirectory, readJSON, writeJSON, CONTENT_BASE } from "@/lib/github";
import type { City } from "@/lib/types";

interface CitiesData {
  cities: City[];
}

export async function GET() {
  try {
    // First try to read from cities.json
    const data = await readJSON<CitiesData>("india-experiences/data/cities.json");

    if (data?.cities?.length) {
      return NextResponse.json(data);
    }

    // Fallback: scan content directories to find cities
    const dirs = await listDirectory(CONTENT_BASE);
    const cities: City[] = dirs
      .filter((d) => d.type === "dir")
      .map((d) => ({
        name: d.name.charAt(0).toUpperCase() + d.name.slice(1),
        slug: d.name,
        state: "",
        tier: 2,
        coordinates: { lat: 0, lng: 0 },
        airport: "",
        nearestHub: null,
        status: "content" as const,
      }));

    return NextResponse.json({ cities });
  } catch (error) {
    console.error("Error fetching cities:", error);
    return NextResponse.json(
      { error: "Failed to fetch cities" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const newCity = (await request.json()) as City;

    // Validate required fields
    if (!newCity.name || !newCity.slug || !newCity.state) {
      return NextResponse.json(
        { error: "Name, slug, and state are required" },
        { status: 400 }
      );
    }

    // Read existing cities
    const data = await readJSON<CitiesData>("india-experiences/data/cities.json");
    const cities = data?.cities || [];

    // Check for duplicate slug
    if (cities.some((c) => c.slug === newCity.slug)) {
      return NextResponse.json(
        { error: "City with this slug already exists" },
        { status: 400 }
      );
    }

    // Add default values
    const cityToAdd: City = {
      name: newCity.name,
      slug: newCity.slug,
      state: newCity.state,
      tier: newCity.tier || 2,
      coordinates: newCity.coordinates || { lat: 0, lng: 0 },
      airport: newCity.airport || "",
      nearestHub: newCity.nearestHub || null,
      status: "new",
    };

    cities.push(cityToAdd);

    // Write back to GitHub
    await writeJSON(
      "india-experiences/data/cities.json",
      { cities },
      `feat: add ${cityToAdd.name} to city registry [admin-tool]`
    );

    return NextResponse.json({ success: true, city: cityToAdd });
  } catch (error) {
    console.error("Error adding city:", error);
    return NextResponse.json(
      { error: "Failed to add city" },
      { status: 500 }
    );
  }
}
