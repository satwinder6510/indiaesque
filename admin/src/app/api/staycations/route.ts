import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON } from "@/lib/github";

const STAYCATIONS_PATH = "india-experiences/src/data/staycations.json";

export interface RoomType {
  id: string;
  name: string;
  description: string;
  pricePerNight: number;
  maxGuests: number;
  amenities: string[];
  images: string[];
}

export interface Staycation {
  slug: string;
  name: string;
  location: string;
  description: string;

  // Images
  homePageImage: string;
  portraitImage: string;
  cardImage: string;
  heroImage: string;
  gallery: { url: string; alt: string }[];

  // Hotel Overview
  overview: {
    description: string;
    highlights: string[];
    checkIn: string;
    checkOut: string;
    amenities: string[];
  };

  // Room Types
  rooms: RoomType[];

  // Destination
  destination: {
    name: string;
    description: string;
    attractions: string[];
    distanceFromAirport: string;
    distanceFromRailway: string;
  };

  // Transfers
  transfers: {
    airportPickup: { available: boolean; price: number };
    railwayPickup: { available: boolean; price: number };
  };

  // Booking
  booking: {
    email: string;
    phone: string;
    whatsapp: string;
    externalUrl: string;
  };

  // Tours
  tours: {
    enabled: boolean;
    source: "viator" | "custom";
    viatorDestinationId: number;
    viatorTagIds: number[];
    customTourIds: string[];
  };

  href: string;
}

/**
 * GET /api/staycations?slug=xxx
 * Get all staycations or a specific one
 */
export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("slug");
    const staycations = await readJSON<Staycation[]>(STAYCATIONS_PATH);

    if (!staycations) {
      return NextResponse.json({ staycations: [] });
    }

    if (slug) {
      const staycation = staycations.find(s => s.slug === slug);
      if (!staycation) {
        return NextResponse.json({ error: "Staycation not found" }, { status: 404 });
      }
      return NextResponse.json({ staycation });
    }

    return NextResponse.json({ staycations });
  } catch (error) {
    console.error("Staycations fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch staycations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/staycations
 * Create a new staycation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, location } = body;

    if (!name || !location) {
      return NextResponse.json({ error: "name and location required" }, { status: 400 });
    }

    const staycations = await readJSON<Staycation[]>(STAYCATIONS_PATH) || [];

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Check if slug already exists
    if (staycations.find(s => s.slug === slug)) {
      return NextResponse.json({ error: "Staycation with this name already exists" }, { status: 409 });
    }

    const newStaycation: Staycation = {
      slug,
      name,
      location,
      description: "",
      homePageImage: "",
      portraitImage: "",
      cardImage: "",
      heroImage: "",
      gallery: [],
      overview: {
        description: "",
        highlights: [],
        checkIn: "2:00 PM",
        checkOut: "11:00 AM",
        amenities: [],
      },
      rooms: [],
      destination: {
        name: location,
        description: "",
        attractions: [],
        distanceFromAirport: "",
        distanceFromRailway: "",
      },
      transfers: {
        airportPickup: { available: false, price: 0 },
        railwayPickup: { available: false, price: 0 },
      },
      booking: {
        email: "",
        phone: "",
        whatsapp: "",
        externalUrl: "",
      },
      tours: {
        enabled: false,
        source: "viator",
        viatorDestinationId: 0,
        viatorTagIds: [],
        customTourIds: [],
      },
      href: `/staycations/${slug}/`,
    };

    staycations.push(newStaycation);

    await writeJSON(STAYCATIONS_PATH, staycations, `feat(staycations): add ${name} [admin]`);

    return NextResponse.json({ success: true, staycation: newStaycation });
  } catch (error) {
    console.error("Staycation create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create staycation" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/staycations
 * Update a staycation
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, updates } = body;

    if (!slug) {
      return NextResponse.json({ error: "slug required" }, { status: 400 });
    }

    const staycations = await readJSON<Staycation[]>(STAYCATIONS_PATH);
    if (!staycations) {
      return NextResponse.json({ error: "Staycations not found" }, { status: 404 });
    }

    const index = staycations.findIndex(s => s.slug === slug);
    if (index === -1) {
      return NextResponse.json({ error: "Staycation not found" }, { status: 404 });
    }

    // Merge updates
    staycations[index] = { ...staycations[index], ...updates };

    await writeJSON(STAYCATIONS_PATH, staycations, `feat(staycations): update ${slug} [admin]`);

    return NextResponse.json({ success: true, staycation: staycations[index] });
  } catch (error) {
    console.error("Staycation update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update staycation" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/staycations?slug=xxx
 * Delete a staycation
 */
export async function DELETE(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "slug required" }, { status: 400 });
    }

    const staycations = await readJSON<Staycation[]>(STAYCATIONS_PATH);
    if (!staycations) {
      return NextResponse.json({ error: "Staycations not found" }, { status: 404 });
    }

    const index = staycations.findIndex(s => s.slug === slug);
    if (index === -1) {
      return NextResponse.json({ error: "Staycation not found" }, { status: 404 });
    }

    const removed = staycations.splice(index, 1)[0];

    await writeJSON(STAYCATIONS_PATH, staycations, `feat(staycations): delete ${removed.name} [admin]`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Staycation delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete staycation" },
      { status: 500 }
    );
  }
}
