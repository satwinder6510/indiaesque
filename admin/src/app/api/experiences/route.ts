import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const INDIA_EXPERIENCES_PATH = path.join(process.cwd(), "..", "india-experiences");
const EXPERIENCES_PATH = path.join(INDIA_EXPERIENCES_PATH, "src", "data", "experiences.json");
const IMAGES_PATH = path.join(INDIA_EXPERIENCES_PATH, "public", "images", "experiences");

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
    const data = await fs.readFile(EXPERIENCES_PATH, "utf-8");
    const experiences: Experience[] = JSON.parse(data);

    // Check which experiences have local images
    const experiencesWithStatus = await Promise.all(
      experiences.map(async (exp) => {
        const localCardPath = path.join(IMAGES_PATH, `${exp.slug}-card.jpg`);
        let hasLocalImage = false;
        try {
          await fs.access(localCardPath);
          hasLocalImage = true;
        } catch {
          hasLocalImage = false;
        }
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

    const data = await fs.readFile(EXPERIENCES_PATH, "utf-8");
    const experiences: Experience[] = JSON.parse(data);

    const index = experiences.findIndex((e) => e.slug === slug);
    if (index === -1) {
      return NextResponse.json({ error: "Experience not found" }, { status: 404 });
    }

    // Update the experience
    experiences[index] = { ...experiences[index], ...updates };

    await fs.writeFile(EXPERIENCES_PATH, JSON.stringify(experiences, null, 2));

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

    const data = await fs.readFile(EXPERIENCES_PATH, "utf-8");
    const experiences: Experience[] = JSON.parse(data);

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
    await fs.writeFile(EXPERIENCES_PATH, JSON.stringify(experiences, null, 2));

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

    const data = await fs.readFile(EXPERIENCES_PATH, "utf-8");
    const experiences: Experience[] = JSON.parse(data);

    const filtered = experiences.filter((e) => e.slug !== slug);

    if (filtered.length === experiences.length) {
      return NextResponse.json({ error: "Experience not found" }, { status: 404 });
    }

    await fs.writeFile(EXPERIENCES_PATH, JSON.stringify(filtered, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting experience:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete experience" },
      { status: 500 }
    );
  }
}
