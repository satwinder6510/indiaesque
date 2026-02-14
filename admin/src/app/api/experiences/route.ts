import { NextResponse } from "next/server";
import { readJSON, writeJSON, fileExists } from "@/lib/github";

const EXPERIENCES_PATH = "india-experiences/src/data/experiences.json";

interface Experience {
  name: string;
  slug: string;
  category: string;
  description: string;
  cardImage: string;
  listImage: string;
  heroImage: string;
  href: string;
  viatorTagId?: number;
  showOnHomepage?: boolean;
  // Curated experience fields
  curated?: boolean;
  cities?: string[];
  price?: string;
  duration?: string;
  bookingUrl?: string;
  priority?: number;
  active?: boolean;
}

export async function GET() {
  try {
    const experiences = await readJSON<Experience[]>(EXPERIENCES_PATH);

    if (!experiences) {
      return NextResponse.json({ error: "Experiences file not found" }, { status: 404 });
    }

    // Check which experiences have local images
    const experiencesWithStatus = await Promise.all(
      experiences.map(async (exp) => {
        const imagePath = `india-experiences/public/images/experiences/${exp.slug}-card.jpg`;
        const hasLocalImage = await fileExists(imagePath);
        return {
          ...exp,
          hasLocalImage,
          isExternalImage: exp.cardImage?.startsWith("http"),
        };
      })
    );

    return NextResponse.json({ experiences: experiencesWithStatus });
  } catch (error) {
    console.error("Error loading experiences:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load experiences" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { slug, updates } = body;

    const experiences = await readJSON<Experience[]>(EXPERIENCES_PATH);
    if (!experiences) {
      return NextResponse.json({ error: "Experiences file not found" }, { status: 404 });
    }

    const index = experiences.findIndex((e) => e.slug === slug);
    if (index === -1) {
      return NextResponse.json({ error: "Experience not found" }, { status: 404 });
    }

    // Update the experience
    experiences[index] = { ...experiences[index], ...updates };

    await writeJSON(EXPERIENCES_PATH, experiences, `Update experience: ${slug}`);

    return NextResponse.json({ success: true, experience: experiences[index] });
  } catch (error) {
    console.error("Error updating experience:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update experience" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, slug, category, description, viatorTagId, curated, cities, price, duration, bookingUrl, priority } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
    }

    const experiences = await readJSON<Experience[]>(EXPERIENCES_PATH);
    if (!experiences) {
      return NextResponse.json({ error: "Experiences file not found" }, { status: 404 });
    }

    // Check if slug already exists
    if (experiences.some((e) => e.slug === slug)) {
      return NextResponse.json({ error: "Experience with this slug already exists" }, { status: 400 });
    }

    const newExperience: Experience = curated ? {
      name,
      slug,
      category: category || "Curated",
      description: description || "",
      cardImage: "",
      listImage: "",
      heroImage: "",
      href: bookingUrl || "",
      curated: true,
      cities: cities || [],
      price: price || "",
      duration: duration || "",
      bookingUrl: bookingUrl || "",
      priority: priority || 10,
      active: true,
      showOnHomepage: false,
    } : {
      name,
      slug,
      category: category || "Tours",
      description: description || "",
      cardImage: "",
      listImage: "",
      heroImage: "",
      href: `/experiences/${slug}/`,
      viatorTagId: viatorTagId || 0,
      showOnHomepage: false,
    };

    experiences.push(newExperience);
    await writeJSON(EXPERIENCES_PATH, experiences, `Add experience: ${slug}`);

    return NextResponse.json({ success: true, experience: newExperience });
  } catch (error) {
    console.error("Error creating experience:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create experience" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    const experiences = await readJSON<Experience[]>(EXPERIENCES_PATH);
    if (!experiences) {
      return NextResponse.json({ error: "Experiences file not found" }, { status: 404 });
    }

    const filtered = experiences.filter((e) => e.slug !== slug);

    if (filtered.length === experiences.length) {
      return NextResponse.json({ error: "Experience not found" }, { status: 404 });
    }

    await writeJSON(EXPERIENCES_PATH, filtered, `Delete experience: ${slug}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting experience:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete experience" },
      { status: 500 }
    );
  }
}
