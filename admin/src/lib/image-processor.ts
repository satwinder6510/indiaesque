import sharp from 'sharp';

export interface ImageSize {
  name: string;
  width: number;
  height: number;
  fit: 'cover' | 'contain' | 'fill';
}

// Image size presets for different contexts
export const imageSizes: Record<string, ImageSize[]> = {
  city: [
    { name: 'hero', width: 1200, height: 600, fit: 'cover' },
    { name: 'hero-mobile', width: 800, height: 600, fit: 'cover' },
    { name: 'card', width: 500, height: 313, fit: 'cover' },
    { name: 'list', width: 800, height: 500, fit: 'cover' },
  ],
  staycation: [
    { name: 'portrait', width: 400, height: 533, fit: 'cover' },
    { name: 'card', width: 800, height: 500, fit: 'cover' },
    { name: 'hero', width: 1200, height: 600, fit: 'cover' },
  ],
  experience: [
    { name: 'card', width: 400, height: 400, fit: 'cover' },
    { name: 'list', width: 800, height: 500, fit: 'cover' },
    { name: 'hero', width: 1200, height: 600, fit: 'cover' },
  ],
  general: [
    { name: 'hero', width: 1920, height: 1080, fit: 'cover' },
    { name: 'featured', width: 800, height: 500, fit: 'cover' },
  ],
  content: [
    { name: 'thumb', width: 400, height: 300, fit: 'cover' },
  ],
};

export interface ProcessedImage {
  name: string;
  buffer: Buffer;
  width: number;
  height: number;
  size: number;
}

/**
 * Process an image into multiple sizes
 */
export async function processImage(
  inputBuffer: Buffer,
  category: keyof typeof imageSizes,
  baseName: string
): Promise<ProcessedImage[]> {
  const sizes = imageSizes[category];
  const results: ProcessedImage[] = [];

  for (const size of sizes) {
    const outputBuffer = await sharp(inputBuffer)
      .resize(size.width, size.height, {
        fit: size.fit,
        position: 'center',
      })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();

    results.push({
      name: `${baseName}-${size.name}.jpg`,
      buffer: outputBuffer,
      width: size.width,
      height: size.height,
      size: outputBuffer.length,
    });
  }

  return results;
}

/**
 * Process a single image to a specific size
 */
export async function resizeImage(
  inputBuffer: Buffer,
  width: number,
  height: number,
  fit: 'cover' | 'contain' | 'fill' = 'cover'
): Promise<Buffer> {
  return sharp(inputBuffer)
    .resize(width, height, {
      fit,
      position: 'center',
    })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();
}

/**
 * Get image metadata
 */
export async function getImageMetadata(buffer: Buffer) {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    size: buffer.length,
  };
}
