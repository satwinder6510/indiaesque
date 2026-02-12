// Extract staycation data from web content using Claude

import Anthropic from "@anthropic-ai/sdk";
import { ExtractedStaycation } from "./types";

const EXTRACTION_PROMPT = `You are a data extraction assistant. Extract hotel/property information from the provided web page content.

CRITICAL RULES:
- Extract ONLY information that is explicitly stated on the page
- Write "Not found" for any information that is missing - do NOT guess or infer
- For images, extract the full URL if available
- Keep descriptions concise but complete
- Do not add any information not present in the source

Extract the following as JSON:
{
  "name": "Hotel/property name exactly as shown",
  "location": "City, Region/State as stated",
  "overview": {
    "description": "Main description of the property (2-3 paragraphs max)",
    "highlights": ["Key feature 1", "Key feature 2", ...],
    "amenities": ["Amenity 1", "Amenity 2", ...]
  },
  "rooms": [
    {
      "name": "Room type name",
      "description": "Room description",
      "images": ["URL1", "URL2"]
    }
  ],
  "booking": {
    "phone": "Phone number if available",
    "email": "Email if available",
    "externalUrl": "Booking URL if available"
  },
  "images": {
    "hero": "Main/hero image URL",
    "gallery": ["Image URL 1", "Image URL 2", ...]
  }
}

IMPORTANT:
- Only include fields where you found actual data
- Omit entire sections if no relevant data was found
- For arrays, include only items with actual content
- Image URLs should be complete (starting with http:// or https://)

Respond with ONLY the JSON object, no explanation or markdown formatting.`;

export async function extractStaycationData(
  content: string
): Promise<ExtractedStaycation> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const anthropic = new Anthropic({ apiKey });

  // Truncate content if too long (Claude has token limits)
  const maxContentLength = 100000;
  const truncatedContent =
    content.length > maxContentLength
      ? content.slice(0, maxContentLength) + "\n...[content truncated]..."
      : content;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `${EXTRACTION_PROMPT}\n\n--- WEB PAGE CONTENT ---\n${truncatedContent}`,
      },
    ],
  });

  // Extract text from response
  const textContent = response.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Parse JSON response
  try {
    // Remove any potential markdown code blocks
    let jsonText = textContent.text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.slice(7);
    }
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith("```")) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();

    const extracted = JSON.parse(jsonText) as ExtractedStaycation;

    // Filter out "Not found" values
    return cleanExtractedData(extracted);
  } catch (error) {
    console.error("Failed to parse Claude response:", textContent.text);
    throw new Error("Failed to parse extracted data from Claude response");
  }
}

function cleanExtractedData(data: ExtractedStaycation): ExtractedStaycation {
  const cleaned: ExtractedStaycation = {};

  // Clean name
  if (data.name && data.name !== "Not found") {
    cleaned.name = data.name;
  }

  // Clean location
  if (data.location && data.location !== "Not found") {
    cleaned.location = data.location;
  }

  // Clean overview
  if (data.overview) {
    const overview: ExtractedStaycation["overview"] = {
      description: "",
      highlights: [],
      amenities: [],
    };

    if (
      data.overview.description &&
      data.overview.description !== "Not found"
    ) {
      overview.description = data.overview.description;
    }

    if (data.overview.highlights) {
      overview.highlights = data.overview.highlights.filter(
        (h) => h && h !== "Not found"
      );
    }

    if (data.overview.amenities) {
      overview.amenities = data.overview.amenities.filter(
        (a) => a && a !== "Not found"
      );
    }

    if (
      overview.description ||
      overview.highlights.length > 0 ||
      overview.amenities.length > 0
    ) {
      cleaned.overview = overview;
    }
  }

  // Clean rooms
  if (data.rooms && data.rooms.length > 0) {
    const rooms = data.rooms
      .filter((r) => r.name && r.name !== "Not found")
      .map((r) => ({
        name: r.name,
        description:
          r.description && r.description !== "Not found" ? r.description : "",
        images: (r.images || []).filter(
          (img) => img && img !== "Not found" && img.startsWith("http")
        ),
      }));

    if (rooms.length > 0) {
      cleaned.rooms = rooms;
    }
  }

  // Clean booking
  if (data.booking) {
    const booking: ExtractedStaycation["booking"] = {
      phone: "",
      email: "",
      externalUrl: "",
    };

    if (data.booking.phone && data.booking.phone !== "Not found") {
      booking.phone = data.booking.phone;
    }
    if (data.booking.email && data.booking.email !== "Not found") {
      booking.email = data.booking.email;
    }
    if (data.booking.externalUrl && data.booking.externalUrl !== "Not found") {
      booking.externalUrl = data.booking.externalUrl;
    }

    if (booking.phone || booking.email || booking.externalUrl) {
      cleaned.booking = booking;
    }
  }

  // Clean images
  if (data.images) {
    const images: ExtractedStaycation["images"] = {
      hero: "",
      gallery: [],
    };

    if (
      data.images.hero &&
      data.images.hero !== "Not found" &&
      data.images.hero.startsWith("http")
    ) {
      images.hero = data.images.hero;
    }

    if (data.images.gallery) {
      images.gallery = data.images.gallery.filter(
        (img) => img && img !== "Not found" && img.startsWith("http")
      );
    }

    if (images.hero || images.gallery.length > 0) {
      cleaned.images = images;
    }
  }

  return cleaned;
}
