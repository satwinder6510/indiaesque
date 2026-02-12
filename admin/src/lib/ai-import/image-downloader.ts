// Download external images with concurrency control

import { ImageDownloadResult } from "./types";

const MAX_CONCURRENT_DOWNLOADS = 3;
const DOWNLOAD_TIMEOUT = 10000; // 10 seconds per image

interface DownloadProgress {
  completed: number;
  total: number;
  current: string;
}

export async function downloadImages(
  urls: string[],
  onProgress?: (progress: DownloadProgress) => void
): Promise<Map<string, Buffer | null>> {
  const results = new Map<string, Buffer | null>();
  const uniqueUrls = [...new Set(urls)];

  // Process in batches
  for (let i = 0; i < uniqueUrls.length; i += MAX_CONCURRENT_DOWNLOADS) {
    const batch = uniqueUrls.slice(i, i + MAX_CONCURRENT_DOWNLOADS);

    const batchPromises = batch.map(async (url) => {
      onProgress?.({
        completed: results.size,
        total: uniqueUrls.length,
        current: url,
      });

      try {
        const buffer = await downloadSingleImage(url);
        results.set(url, buffer);
      } catch (error) {
        console.error(`Failed to download ${url}:`, error);
        results.set(url, null);
      }
    });

    await Promise.all(batchPromises);
  }

  onProgress?.({
    completed: uniqueUrls.length,
    total: uniqueUrls.length,
    current: "",
  });

  return results;
}

async function downloadSingleImage(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/*,*/*;q=0.8",
        Referer: new URL(url).origin,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      throw new Error(`Not an image: ${contentType}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Download timeout");
    }

    throw error;
  }
}

export function collectImageUrls(data: {
  images?: { hero?: string; gallery?: string[] };
  rooms?: { images?: string[] }[];
}): string[] {
  const urls: string[] = [];

  // Hero image
  if (data.images?.hero) {
    urls.push(data.images.hero);
  }

  // Gallery images
  if (data.images?.gallery) {
    urls.push(...data.images.gallery);
  }

  // Room images
  if (data.rooms) {
    for (const room of data.rooms) {
      if (room.images) {
        urls.push(...room.images);
      }
    }
  }

  // Filter valid URLs
  return urls.filter(
    (url) => url && (url.startsWith("http://") || url.startsWith("https://"))
  );
}

export function generateImageResults(
  urls: string[],
  downloadedImages: Map<string, Buffer | null>,
  uploadedUrls: Map<string, string>
): ImageDownloadResult[] {
  return urls.map((url) => {
    const buffer = downloadedImages.get(url);
    const localUrl = uploadedUrls.get(url);

    if (localUrl) {
      return {
        originalUrl: url,
        localUrl,
      };
    } else if (buffer === null) {
      return {
        originalUrl: url,
        localUrl: null,
        error: "Download failed",
      };
    } else {
      return {
        originalUrl: url,
        localUrl: null,
        error: "Upload failed",
      };
    }
  });
}
