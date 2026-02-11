// Viator API Service - Products endpoint

const VIATOR_API_KEY = import.meta.env.VIATOR_API_KEY || process.env.VIATOR_API_KEY || '';
const VIATOR_BASE_URL = 'https://api.viator.com/partner';

// Debug: log whether API key is available at build time
console.log('VIATOR_API_KEY available:', VIATOR_API_KEY ? 'YES (length: ' + VIATOR_API_KEY.length + ')' : 'NO');

// Destination IDs for Indian cities (verified from Viator)
// Destination IDs from GET /destinations endpoint (refreshed 2026-02-11)
export const DESTINATIONS = {
  delhi: { id: 804, name: 'Delhi' },
  jaipur: { id: 4627, name: 'Jaipur' },
  mumbai: { id: 953, name: 'Mumbai' },
  goa: { id: 4594, name: 'Goa' },
  agra: { id: 4547, name: 'Agra' },
  varanasi: { id: 22015, name: 'Varanasi' },
  kolkata: { id: 4924, name: 'Kolkata' },
  udaipur: { id: 5106, name: 'Udaipur' },
  kerala: { id: 964, name: 'Kerala' },
};

export interface ViatorProduct {
  productCode: string;
  title: string;
  description: string;
  duration: string;
  price: {
    amount: number;
    currency: string;
  };
  rating: number;
  reviewCount: number;
  imageUrl: string;
  bookingLink: string;
}

interface SearchParams {
  destId: number;
  limit?: number;
}

export async function searchProducts(params: SearchParams): Promise<ViatorProduct[]> {
  if (!VIATOR_API_KEY) {
    console.warn('Viator API key not configured, skipping');
    return [];
  }

  try {
    const requestBody: any = {
      filtering: {
        destination: params.destId,
      },
      pagination: {
        start: 1,
        count: params.limit || 6,
      },
      currency: 'INR',
    };

    console.log('Viator Products request:', JSON.stringify(requestBody));

    const response = await fetch(`${VIATOR_BASE_URL}/products/search`, {
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
      console.error('Viator Products error:', response.status, errorText);
      throw new Error(`Viator Products error: ${response.status}`);
    }

    const data = await response.json();
    const products = data.products || [];
    console.log('Viator Products success, count:', products.length);
    return transformProducts(products);
  } catch (error) {
    console.error('Viator Products error:', error);
    return [];
  }
}

function transformProducts(products: any[]): ViatorProduct[] {
  return products.map(p => {
    // Reviews: { sources: [{ provider, totalCount, averageRating }] }
    const viatorReviews = p.reviews?.sources?.find((s: any) => s.provider === 'VIATOR');
    const rating = viatorReviews?.averageRating || 0;
    const reviewCount = viatorReviews?.totalCount || 0;

    // Duration
    const mins = p.duration?.fixedDurationInMinutes;
    let duration = 'Varies';
    if (mins) {
      if (mins >= 1440) {
        const days = Math.round(mins / 1440);
        duration = days === 1 ? '1 day' : `${days} days`;
      } else {
        const hours = Math.round(mins / 60);
        duration = hours === 1 ? '1 hour' : `${hours} hours`;
      }
    }

    return {
      productCode: p.productCode,
      title: p.title,
      description: p.description || '',
      duration,
      price: {
        amount: p.pricing?.summary?.fromPrice || 0,
        currency: p.pricing?.currency || 'INR',
      },
      rating,
      reviewCount,
      imageUrl: selectBestImage(p.images),
      bookingLink: p.productUrl || `https://www.viator.com/tours/${p.productCode}`,
    };
  });
}

// Products images: { isCover, variants: [{ url, width, height }] }
function selectBestImage(images: any[]): string {
  if (!images || images.length === 0) return '';

  const coverImage = images.find((img: any) => img.isCover) || images[0];

  if (!coverImage.variants || coverImage.variants.length === 0) {
    return coverImage.url || '';
  }

  // Sort variants by width, pick best fit for ~600px card
  const variants = [...coverImage.variants].sort((a: any, b: any) => a.width - b.width);
  const bestFit = variants.find((v: any) => v.width >= 600);
  return bestFit?.url || variants[variants.length - 1]?.url || '';
}

export function getDestinationId(city: string): number | undefined {
  return DESTINATIONS[city.toLowerCase() as keyof typeof DESTINATIONS]?.id;
}
