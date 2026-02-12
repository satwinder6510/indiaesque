import { NextRequest } from "next/server";
import { fetchWebContent } from "@/lib/ai-import/jina-fetcher";
import { extractStaycationData } from "@/lib/ai-import/content-extractor";
import {
  downloadImages,
  collectImageUrls,
  generateImageResults,
} from "@/lib/ai-import/image-downloader";
import {
  AIImportProgress,
  ExtractedStaycation,
  ImageDownloadResult,
} from "@/lib/ai-import/types";
import { uploadBinaryFile } from "@/lib/github";
import { processImage } from "@/lib/image-processor";

const IMAGES_BASE = "india-experiences/public/images/staycations";

// GitHub raw content URL for displaying images in admin
const getGitHubRawUrl = (path: string) => {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  return `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;
};

function createSSEResponse(
  stream: ReadableStream<Uint8Array>
): Response {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function encodeSSE(data: AIImportProgress): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  const { url, slug } = await request.json();

  if (!url || !slug) {
    return new Response(
      JSON.stringify({ error: "url and slug are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (progress: AIImportProgress) => {
        controller.enqueue(encoder.encode(encodeSSE(progress)));
      };

      try {
        // Step 1: Fetch web content via Jina Reader
        send({
          step: "fetching",
          message: "Fetching page content via Jina Reader...",
          progress: 10,
        });

        let webContent: string;
        try {
          webContent = await fetchWebContent(url);
        } catch (error) {
          send({
            step: "error",
            message: `Failed to fetch page: ${error instanceof Error ? error.message : "Unknown error"}`,
            error: error instanceof Error ? error.message : "Fetch failed",
          });
          controller.close();
          return;
        }

        // Step 2: Extract structured data with Claude
        send({
          step: "extracting",
          message: "Analyzing content with AI...",
          progress: 30,
        });

        let extractedData: ExtractedStaycation;
        try {
          extractedData = await extractStaycationData(webContent);
        } catch (error) {
          send({
            step: "error",
            message: `Failed to extract data: ${error instanceof Error ? error.message : "Unknown error"}`,
            error: error instanceof Error ? error.message : "Extraction failed",
          });
          controller.close();
          return;
        }

        // Collect all image URLs from extracted data
        const imageUrls = collectImageUrls(extractedData);

        if (imageUrls.length === 0) {
          // No images to download, complete
          send({
            step: "complete",
            message: "Import complete (no images found)",
            progress: 100,
            data: extractedData,
            imageResults: [],
          });
          controller.close();
          return;
        }

        // Step 3: Download external images
        send({
          step: "downloading_images",
          message: `Downloading ${imageUrls.length} images...`,
          progress: 50,
        });

        const downloadedImages = await downloadImages(imageUrls, (progress) => {
          const downloadProgress =
            50 + Math.floor((progress.completed / progress.total) * 20);
          send({
            step: "downloading_images",
            message: `Downloading images (${progress.completed}/${progress.total})...`,
            progress: downloadProgress,
          });
        });

        // Step 4: Upload images to GitHub
        send({
          step: "uploading_images",
          message: "Uploading images to GitHub...",
          progress: 70,
        });

        const uploadedUrls = new Map<string, string>();
        let uploadCount = 0;

        for (const [originalUrl, buffer] of downloadedImages.entries()) {
          if (buffer === null) continue;

          try {
            // Generate a unique name based on the URL
            const urlHash = originalUrl
              .split("/")
              .pop()
              ?.replace(/[^a-zA-Z0-9]/g, "")
              .slice(0, 20) || "img";
            const imageName = `${slug}-imported-${urlHash}-${Date.now()}`;

            // Process image to standard format
            const processedImages = await processImage(
              buffer,
              "general",
              imageName
            );

            if (processedImages.length > 0) {
              const mainImage = processedImages[0];
              const path = `${IMAGES_BASE}/${mainImage.name}`;
              const base64Content = mainImage.buffer.toString("base64");

              await uploadBinaryFile(
                path,
                base64Content,
                `feat(images): import ${mainImage.name} [ai-import]`
              );

              // Store the GitHub raw URL
              uploadedUrls.set(originalUrl, getGitHubRawUrl(path));
            }

            uploadCount++;
            const uploadProgress =
              70 + Math.floor((uploadCount / downloadedImages.size) * 25);
            send({
              step: "uploading_images",
              message: `Uploading images (${uploadCount}/${downloadedImages.size})...`,
              progress: uploadProgress,
            });
          } catch (error) {
            console.error(`Failed to upload image from ${originalUrl}:`, error);
            // Continue with other images
          }
        }

        // Generate image results
        const imageResults: ImageDownloadResult[] = generateImageResults(
          imageUrls,
          downloadedImages,
          uploadedUrls
        );

        // Update extracted data with local URLs
        const updatedData = replaceImageUrls(extractedData, uploadedUrls);

        // Step 5: Complete
        send({
          step: "complete",
          message: `Import complete! ${uploadedUrls.size}/${imageUrls.length} images uploaded.`,
          progress: 100,
          data: updatedData,
          imageResults,
        });

        controller.close();
      } catch (error) {
        send({
          step: "error",
          message: `Import failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        controller.close();
      }
    },
  });

  return createSSEResponse(stream);
}

function replaceImageUrls(
  data: ExtractedStaycation,
  urlMap: Map<string, string>
): ExtractedStaycation {
  const result = { ...data };

  // Replace hero image
  if (result.images?.hero && urlMap.has(result.images.hero)) {
    result.images = {
      ...result.images,
      hero: urlMap.get(result.images.hero)!,
    };
  }

  // Replace gallery images
  if (result.images?.gallery) {
    result.images = {
      ...result.images,
      gallery: result.images.gallery.map((url) => urlMap.get(url) || url),
    };
  }

  // Replace room images
  if (result.rooms) {
    result.rooms = result.rooms.map((room) => ({
      ...room,
      images: room.images?.map((url) => urlMap.get(url) || url) || [],
    }));
  }

  return result;
}
