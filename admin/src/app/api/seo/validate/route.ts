import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

const INDIA_EXPERIENCES_PATH = path.join(process.cwd(), "..", "india-experiences");

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { city } = body;

    if (!city) {
      return NextResponse.json({ success: false, error: "City is required" }, { status: 400 });
    }

    // Run the validator script
    const result = await new Promise<{ success: boolean; data?: unknown; error?: string }>((resolve) => {
      const script = `
        import('file://${INDIA_EXPERIENCES_PATH.replace(/\\/g, "/")}/tools/admin/services/validator.js')
          .then(async ({ validator }) => {
            try {
              const result = await validator({ city: '${city}' });
              console.log(JSON.stringify({ success: true, data: result }));
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
        env: { ...process.env },
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
            resolve({ success: false, error: errorOutput || "Validation failed" });
          }
        }
      });
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to validate" },
      { status: 500 }
    );
  }
}
