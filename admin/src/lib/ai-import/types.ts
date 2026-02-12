// Types for AI Import feature

export interface ExtractedRoom {
  name: string;
  description: string;
  images: string[];
}

export interface ExtractedOverview {
  description: string;
  highlights: string[];
  amenities: string[];
}

export interface ExtractedBooking {
  phone: string;
  email: string;
  externalUrl: string;
}

export interface ExtractedImages {
  hero: string;
  gallery: string[];
}

export interface ExtractedStaycation {
  name?: string;
  location?: string;
  overview?: ExtractedOverview;
  rooms?: ExtractedRoom[];
  booking?: ExtractedBooking;
  images?: ExtractedImages;
}

export interface AIImportRequest {
  url: string;
  slug: string;
}

export interface ImageDownloadResult {
  originalUrl: string;
  localUrl: string | null;
  error?: string;
}

export type AIImportStep =
  | "fetching"
  | "extracting"
  | "downloading_images"
  | "uploading_images"
  | "complete"
  | "error";

export interface AIImportProgress {
  step: AIImportStep;
  message: string;
  progress?: number;
  data?: ExtractedStaycation;
  imageResults?: ImageDownloadResult[];
  error?: string;
}
