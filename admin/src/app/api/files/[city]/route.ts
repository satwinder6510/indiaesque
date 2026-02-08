import { NextRequest, NextResponse } from "next/server";
import { listDirectory, readFile } from "@/lib/github";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ city: string }> }
) {
  try {
    const { city } = await params;

    // List all files in the city content directory
    const files = await listDirectory(`india-experiences/src/content/${city}`);
    const mdFiles = files
      .filter((f) => f.name.endsWith(".md"))
      .map((f) => ({
        name: f.name,
        path: f.path,
        size: f.size,
      }));

    return NextResponse.json({ files: mdFiles });
  } catch (error) {
    console.error("Error listing files:", error);
    return NextResponse.json({ files: [] });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ city: string }> }
) {
  try {
    const { city } = await params;
    const { fileName } = await request.json();

    if (!fileName) {
      return NextResponse.json(
        { error: "fileName is required" },
        { status: 400 }
      );
    }

    // For now, just return success - actual deletion would need to be implemented
    // with proper confirmation flow
    return NextResponse.json({
      success: true,
      message: `File ${fileName} marked for deletion (implement with confirmation)`,
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}

// Get file content
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ city: string }> }
) {
  try {
    const { city } = await params;
    const { fileName } = await request.json();

    if (!fileName) {
      return NextResponse.json(
        { error: "fileName is required" },
        { status: 400 }
      );
    }

    const content = await readFile(`india-experiences/src/content/${city}/${fileName}`);

    if (!content) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Error reading file:", error);
    return NextResponse.json(
      { error: "Failed to read file" },
      { status: 500 }
    );
  }
}
