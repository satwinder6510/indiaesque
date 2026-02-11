// Viator API Service - Attractions endpoint

const VIATOR_API_KEY = import.meta.env.VIATOR_API_KEY || '';
const VIATOR_BASE_URL = 'https://api.viator.com/partner';

// Destination IDs for Indian cities (verified from Viator)
export const DESTINATIONS = {
  delhi: { id: 804, name: 'Delhi' },
  jaipur: { id: 1469, name: 'Jaipur' },
  mumbai: { id: 953, name: 'Mumbai' },
  goa: { id: 4704, name: 'Goa' },
  agra: { id: 4282, name: 'Agra' },
  varanasi: { id: 960, name: 'Varanasi' },
  kolkata: { id: 954, name: 'Kolkata' },
  udaipur: { id: 959, name: 'Udaipur' },
  kerala: { id: 958, name: 'Kerala' },
};

export interface ViatorAttraction {
  attractionId: number;
  title: string;
  description: string;
  imageUrl: string;
  attractionUrl: string;
  productCount: number;
  rating: number;
  reviewCount: number;
}

interface AttractionsParams {
  destId: number;
  limit?: number;
}

export async function searchAttractions(params: AttractionsParams): Promise<ViatorAttraction[]> {
  if (!VIATOR_API_KEY) {
    console.warn('Viator API key not configured, skipping');
    return [];
  }

  try {
    const requestBody: any = {
      destinationId: params.destId,
      pagination: {
        start: 1,
        count: params.limit || 6,
      },
    };

    console.log('Viator Attractions request:', JSON.stringify(requestBody));

    const response = await fetch(`${VIATOR_BASE_URL}/attractions/search`, {
      method: 'POST',
      headers: {
        'exp-api-key': VIATOR_API_KEY,
        'Accept': 'application/json;version=2.0',
        'Content-Type': 'application/json',
        'Accept-Language': 'en-US',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Viator Attractions error:', response.status, errorText);
      throw new Error(`Viator Attractions error: ${response.status}`);
    }

    const data = await response.json();
    const attractions = data.attractions || [];
    console.log('Viator Attractions success, count:', attractions.length);
    return transformAttractions(attractions);
  } catch (error) {
    console.error('Viator Attractions error:', error);
    return [];
  }
}

function transformAttractions(attractions: any[]): ViatorAttraction[] {
  return attractions.map(a => ({
    attractionId: a.attractionId,
    title: a.title || a.name || '',
    description: a.shortDescription || a.description || '',
    imageUrl: selectBestImage(a.images),
    attractionUrl: a.attractionUrl || '#',
    productCount: a.productCount || 0,
    rating: a.reviews?.combinedAverageRating || a.rating || 0,
    reviewCount: a.reviews?.totalReviews || a.reviewCount || 0,
  }));
}

function selectBestImage(images: any[]): string {
  if (!images || images.length === 0) return '';

  // Find cover image first, or use first image
  const coverImage = images.find((img: any) => img.isCover) || images[0];

  if (!coverImage.variants || coverImage.variants.length === 0) {
    return coverImage.url || '';
  }

  // Sort variants by width and find best fit for card (~600px)
  const variants = coverImage.variants.sort((a: any, b: any) => a.width - b.width);
  const bestFit = variants.find((v: any) => v.width >= 600);
  return bestFit?.url || variants[variants.length - 1]?.url || coverImage.url || '';
}

export function getDestinationId(city: string): number | undefined {
  return DESTINATIONS[city.toLowerCase() as keyof typeof DESTINATIONS]?.id;
}
