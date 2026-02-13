import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

const INDIA_EXPERIENCES_PATH = path.join(process.cwd(), "..", "india-experiences");

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { city, pageId } = body;

    // Run the generator script directly
    const result = await new Promise<{ success: boolean; error?: string }>((resolve) => {
      const script = `
        import('file://${INDIA_EXPERIENCES_PATH.replace(/\\/g, "/")}/tools/admin/services/generator.js')
          .then(async ({ generatePage }) => {
            try {
              await generatePage('${city}', '${pageId}');
              console.log(JSON.stringify({ success: true }));
            } catch (err) {
              console.log(JSON.stringify({ success: false, error: err.message }));
            }
          })
          .catch(err => {
            console.log(JSON.stringify({ success: false, error: err.message }));
          });
      `;

      const child = spawn("node", ["--experimental-vm-modules", "-e", script], {
        cwd: INDIA_EXPERIENCES_PATH,
        env: {
          ...process.env,
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
        },
      });

      let output = "";
      let errorOutput = "";

      child.stdout.on("data", (data) => {
        output += data.toString();
      });

      child.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      child.on("close", (code) => {
        // Try to parse the last line as JSON result
        const lines = output.trim().split("\n");
        const lastLine = lines[lines.length - 1];

        try {
          const result = JSON.parse(lastLine);
          resolve(result);
        } catch {
          if (code === 0) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: errorOutput || "Generation failed" });
          }
        }
      });
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to generate" },
      { status: 500 }
    );
  }
}
