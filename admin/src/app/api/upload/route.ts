import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { uploadBinaryFile } from "@/lib/github";

const IMAGES_BASE = "india-experiences/public/images/content";

/**
 * POST /api/upload
 * Upload content block images to GitHub
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    // Get file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process image - resize to thumbnail
    const processed = await sharp(buffer)
      .resize(400, 300, { fit: "cover", position: "center" })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();

    // Generate filename
    const filename = `${name || Date.now()}.jpg`;
    const filepath = `${IMAGES_BASE}/${filename}`;

    // Upload to GitHub
    const base64Content = processed.toString("base64");
    await uploadBinaryFile(
      filepath,
      base64Content,
      `feat(images): add content image ${filename} [admin]`
    );

    return NextResponse.json({
      success: true,
      url: `/images/content/${filename}`,
      filename,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
