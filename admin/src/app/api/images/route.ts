import { NextRequest, NextResponse } from "next/server";
import { listDirectory, uploadBinaryFile } from "@/lib/github";

const IMAGES_BASE = "india-experiences/public/images/cities";

export interface CityImage {
  name: string;
  path: string;
  size: number;
  type: "desktop" | "mobile";
  url: string;
}

/**
 * GET /api/images?city=delhi
 * List images for a city
 */
export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get("city");

  if (!city) {
    return NextResponse.json({ error: "City is required" }, { status: 400 });
  }

  try {
    const files = await listDirectory(IMAGES_BASE);

    // Filter files for this city
    const cityImages: CityImage[] = files
      .filter((f) => f.type === "file" && f.name.startsWith(`${city}-hero`))
      .map((f) => ({
        name: f.name,
        path: f.path,
        size: f.size,
        type: f.name.includes("-mobile") ? "mobile" as const : "desktop" as const,
        url: `/images/cities/${f.name}`,
      }));

    return NextResponse.json({
      city,
      images: cityImages,
      hasDesktop: cityImages.some((i) => i.type === "desktop"),
      hasMobile: cityImages.some((i) => i.type === "mobile"),
    });
  } catch (error) {
    console.error("List images error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list images" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/images
 * Upload an image for a city
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const city = formData.get("city") as string;
    const imageType = formData.get("type") as "desktop" | "mobile";
    const file = formData.get("file") as File;

    if (!city || !imageType || !file) {
      return NextResponse.json(
        { error: "City, type, and file are required" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Get file extension
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const allowedExts = ["jpg", "jpeg", "png", "webp"];
    if (!allowedExts.includes(ext)) {
      return NextResponse.json(
        { error: "Allowed formats: JPG, PNG, WebP" },
        { status: 400 }
      );
    }

    // Build filename
    const filename =
      imageType === "mobile"
        ? `${city}-hero-mobile.${ext}`
        : `${city}-hero.${ext}`;

    const path = `${IMAGES_BASE}/${filename}`;

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Content = Buffer.from(arrayBuffer).toString("base64");

    // Upload to GitHub
    const result = await uploadBinaryFile(
      path,
      base64Content,
      `feat(images): add ${filename} [admin-tool]`
    );

    return NextResponse.json({
      status: "success",
      filename,
      path,
      size: file.size,
      sha: result.sha,
    });
  } catch (error) {
    console.error("Upload image error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
