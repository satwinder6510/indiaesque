import { NextRequest, NextResponse } from "next/server";
import { listDirectory, uploadBinaryFile } from "@/lib/github";
import { processImage, imageSizes, getImageMetadata } from "@/lib/image-processor";

const IMAGES_BASE = "india-experiences/public/images";

export interface ImageInfo {
  name: string;
  path: string;
  size: number;
  variant: string;
  url: string;
}

/**
 * GET /api/images?category=cities&name=delhi
 * List images for an item
 */
export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category") || "cities";
  const name = request.nextUrl.searchParams.get("name");

  try {
    const basePath = `${IMAGES_BASE}/${category}`;
    const files = await listDirectory(basePath);

    let images: ImageInfo[] = files
      .filter((f) => f.type === "file" && f.name.endsWith(".jpg"))
      .map((f) => {
        // Extract variant from filename (e.g., delhi-hero.jpg -> hero)
        const parts = f.name.replace(".jpg", "").split("-");
        const variant = parts.slice(1).join("-") || "original";

        return {
          name: f.name,
          path: f.path,
          size: f.size,
          variant,
          url: `/images/${category}/${f.name}`,
        };
      });

    // Filter by name if provided
    if (name) {
      images = images.filter((f) => f.name.startsWith(`${name}-`));
    }

    // Get available sizes for this category
    const categoryKey = category === "cities" ? "city" :
                        category === "staycations" ? "staycation" :
                        category === "experiences" ? "experience" : "general";
    const requiredSizes = imageSizes[categoryKey] || [];

    return NextResponse.json({
      category,
      name,
      images,
      requiredSizes: requiredSizes.map(s => ({
        variant: s.name,
        width: s.width,
        height: s.height,
      })),
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
 * Upload an image and generate all required sizes
 *
 * Body (FormData):
 * - file: Image file
 * - category: cities | staycations | experiences
 * - name: Item name (e.g., delhi, rajasthan-palace, food-tours)
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const category = formData.get("category") as string;
    const name = formData.get("name") as string;

    if (!file || !category || !name) {
      return NextResponse.json(
        { error: "file, category, and name are required" },
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

    // Map category to processor key
    const categoryKey = category === "cities" ? "city" :
                        category === "staycations" ? "staycation" :
                        category === "experiences" ? "experience" : "general";

    // Get image buffer
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Get original image metadata
    const metadata = await getImageMetadata(inputBuffer);

    // Process image into all required sizes
    const processedImages = await processImage(inputBuffer, categoryKey, name);

    // Upload all processed images to GitHub
    const uploadResults = [];
    for (const img of processedImages) {
      const path = `${IMAGES_BASE}/${category}/${img.name}`;
      const base64Content = img.buffer.toString("base64");

      const result = await uploadBinaryFile(
        path,
        base64Content,
        `feat(images): add ${img.name} [admin-tool]`
      );

      uploadResults.push({
        name: img.name,
        path,
        width: img.width,
        height: img.height,
        size: img.size,
        url: `/images/${category}/${img.name}`,
        sha: result.sha,
      });
    }

    return NextResponse.json({
      status: "success",
      original: {
        name: file.name,
        width: metadata.width,
        height: metadata.height,
        size: metadata.size,
      },
      generated: uploadResults,
      message: `Generated ${uploadResults.length} image sizes`,
    });
  } catch (error) {
    console.error("Upload image error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
