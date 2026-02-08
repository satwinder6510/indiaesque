import { NextResponse } from "next/server";
import { listDirectory, CONTENT_BASE } from "@/lib/github";

export async function GET() {
  const debugInfo: Record<string, unknown> = {
    GITHUB_OWNER: process.env.GITHUB_OWNER || "NOT SET",
    GITHUB_REPO: process.env.GITHUB_REPO || "NOT SET",
    GITHUB_TOKEN: process.env.GITHUB_TOKEN ? "SET (hidden)" : "NOT SET",
    CONTENT_BASE,
  };

  try {
    const dirs = await listDirectory(CONTENT_BASE);
    debugInfo.directories = dirs;
    debugInfo.dirCount = dirs.length;
  } catch (error) {
    debugInfo.error = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(debugInfo);
}
