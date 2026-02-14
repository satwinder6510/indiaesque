import { NextResponse } from "next/server";

const VIATOR_API_KEY = process.env.VIATOR_API_KEY || "";

interface ViatorProduct {
  productCode: string;
  title: string;
  description: string;
  duration: string;
  price: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  bookingUrl: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productCode = searchParams.get("code");
  const provider = searchParams.get("provider") || "viator";

  if (!productCode) {
    return NextResponse.json({ error: "Product code is required" }, { status: 400 });
  }

  if (provider === "viator") {
    return await lookupViatorProduct(productCode);
  } else if (provider === "gyg") {
    return await lookupGYGProduct(productCode);
  }

  return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
}

async function lookupViatorProduct(productCode: string) {
  if (!VIATOR_API_KEY) {
    return NextResponse.json({ error: "Viator API key not configured" }, { status: 500 });
  }

  try {
    const response = await fetch(`https://api.viator.com/partner/products/${productCode}`, {
      method: "GET",
      headers: {
        "exp-api-key": VIATOR_API_KEY,
        "Accept": "application/json;version=2.0",
        "Accept-Language": "en-US",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Viator lookup error:", response.status, errorText);
      return NextResponse.json(
        { error: `Product not found (${response.status})` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const product = transformViatorProduct(data);

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Viator lookup error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch product" },
      { status: 500 }
    );
  }
}

function transformViatorProduct(p: any): ViatorProduct {
  // Reviews
  const viatorReviews = p.reviews?.sources?.find((s: any) => s.provider === "VIATOR");
  const rating = viatorReviews?.averageRating || 0;
  const reviewCount = viatorReviews?.totalCount || 0;

  // Duration
  const mins = p.duration?.fixedDurationInMinutes;
  let duration = "Varies";
  if (mins) {
    if (mins >= 1440) {
      const days = Math.round(mins / 1440);
      duration = days === 1 ? "1 day" : `${days} days`;
    } else if (mins >= 60) {
      const hours = Math.round(mins / 60);
      duration = hours === 1 ? "1 hour" : `${hours} hours`;
    } else {
      duration = `${mins} mins`;
    }
  }

  // Price
  const priceAmount = p.pricing?.summary?.fromPrice || 0;
  const price = priceAmount > 0 ? `From ₹${Math.round(priceAmount).toLocaleString()}` : "";

  // Image
  let imageUrl = "";
  if (p.images && p.images.length > 0) {
    const coverImage = p.images.find((img: any) => img.isCover) || p.images[0];
    if (coverImage.variants && coverImage.variants.length > 0) {
      const variants = [...coverImage.variants].sort((a: any, b: any) => a.width - b.width);
      const bestFit = variants.find((v: any) => v.width >= 600);
      imageUrl = bestFit?.url || variants[variants.length - 1]?.url || "";
    }
  }

  return {
    productCode: p.productCode,
    title: p.title,
    description: p.description || "",
    duration,
    price,
    rating,
    reviewCount,
    imageUrl,
    bookingUrl: p.productUrl || `https://www.viator.com/tours/${p.productCode}`,
  };
}

async function lookupGYGProduct(activityId: string) {
  // GYG API integration placeholder
  // The GetYourGuide Partner API requires authentication setup
  // For now, return a helpful error message
  return NextResponse.json(
    {
      error: "GYG lookup not yet configured. Enter the product URL manually in the booking URL field.",
      hint: `https://www.getyourguide.com/activity-${activityId}`
    },
    { status: 501 }
  );
}
