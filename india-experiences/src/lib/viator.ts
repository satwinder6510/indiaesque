// Viator API Service
// Replace with your actual API key once activated

const VIATOR_API_KEY = import.meta.env.VIATOR_API_KEY || '';
const VIATOR_BASE_URL = 'https://api.viator.com/partner';

// Tag IDs for filtering
export const VIATOR_TAGS = {
  FOOD_DRINK: 21911,
  DINING: 11890,
  OUTDOOR: 21909,
  TOURS_SIGHTSEEING: 21913,
  CULTURAL: 21482,
  WALKING_TOURS: 11851,
  ADVENTURE: 21480,
  WORKSHOPS: 11770,
};

// Destination IDs for Indian cities
export const DESTINATIONS = {
  delhi: { id: 684, name: 'Delhi' },
  jaipur: { id: 953, name: 'Jaipur' },
  mumbai: { id: 955, name: 'Mumbai' },
  goa: { id: 947, name: 'Goa' },
  agra: { id: 930, name: 'Agra' },
  varanasi: { id: 960, name: 'Varanasi' },
  kolkata: { id: 951, name: 'Kolkata' },
  udaipur: { id: 959, name: 'Udaipur' },
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
  images: { url: string }[];
  bookingLink: string;
}

interface SearchParams {
  destId: number;
  tagIds?: number[];
  limit?: number;
}

export async function searchProducts(params: SearchParams): Promise<ViatorProduct[]> {
  if (!VIATOR_API_KEY) {
    console.warn('Viator API key not configured, using mock data');
    return getMockProducts(params);
  }

  try {
    const response = await fetch(`${VIATOR_BASE_URL}/products/search`, {
      method: 'POST',
      headers: {
        'exp-api-key': VIATOR_API_KEY,
        'Accept': 'application/json;version=2.0',
        'Content-Type': 'application/json',
        'Accept-Language': 'en-US',
      },
      body: JSON.stringify({
        filtering: {
          destination: params.destId.toString(),
          tags: params.tagIds,
        },
        pagination: {
          offset: 0,
          limit: params.limit || 6,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Viator API error: ${response.status}`);
    }

    const data = await response.json();
    return transformProducts(data.products);
  } catch (error) {
    console.error('Viator API error:', error);
    return getMockProducts(params);
  }
}

function transformProducts(products: any[]): ViatorProduct[] {
  return products.map(p => ({
    productCode: p.productCode,
    title: p.title,
    description: p.shortDescription || p.description,
    duration: p.duration?.fixedDurationInMinutes
      ? `${Math.round(p.duration.fixedDurationInMinutes / 60)} hours`
      : 'Varies',
    price: {
      amount: p.pricing?.summary?.fromPrice || 0,
      currency: p.pricing?.currency || 'USD',
    },
    rating: p.reviews?.combinedAverageRating || 0,
    reviewCount: p.reviews?.totalReviews || 0,
    images: p.images || [],
    bookingLink: `https://www.viator.com/tours/${p.productCode}?pid=YOURPID`,
  }));
}

// Mock data for development/fallback
function getMockProducts(params: SearchParams): ViatorProduct[] {
  const cityName = Object.entries(DESTINATIONS).find(([_, v]) => v.id === params.destId)?.[1]?.name || 'Delhi';

  const mockExperiences = [
    {
      productCode: 'MOCK001',
      title: `Old ${cityName} Street Food Walk`,
      description: `Explore the hidden culinary gems of ${cityName} with a local guide. Taste authentic street food and learn about the city's rich food culture.`,
      duration: '3 hours',
      price: { amount: 45, currency: 'USD' },
      rating: 4.8,
      reviewCount: 342,
      images: [{ url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=80' }],
      bookingLink: '#',
    },
    {
      productCode: 'MOCK002',
      title: `${cityName} Heritage Walking Tour`,
      description: `Discover centuries of history as you walk through ancient streets, monuments, and hidden courtyards with an expert historian.`,
      duration: '4 hours',
      price: { amount: 35, currency: 'USD' },
      rating: 4.9,
      reviewCount: 567,
      images: [{ url: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&q=80' }],
      bookingLink: '#',
    },
    {
      productCode: 'MOCK003',
      title: `Sunset Photography Tour in ${cityName}`,
      description: `Capture stunning photos at the most photogenic spots with a professional photographer guide.`,
      duration: '3 hours',
      price: { amount: 55, currency: 'USD' },
      rating: 4.7,
      reviewCount: 189,
      images: [{ url: 'https://images.unsplash.com/photo-1545126922-8f56b5a07e9e?w=600&q=80' }],
      bookingLink: '#',
    },
    {
      productCode: 'MOCK004',
      title: `Traditional Craft Workshop`,
      description: `Learn traditional arts and crafts from master artisans. Create your own souvenir to take home.`,
      duration: '2.5 hours',
      price: { amount: 40, currency: 'USD' },
      rating: 4.6,
      reviewCount: 98,
      images: [{ url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&q=80' }],
      bookingLink: '#',
    },
    {
      productCode: 'MOCK005',
      title: `${cityName} by Night Bike Tour`,
      description: `Experience the city's nightlife and illuminated monuments on this exciting evening bike tour.`,
      duration: '3.5 hours',
      price: { amount: 50, currency: 'USD' },
      rating: 4.8,
      reviewCount: 234,
      images: [{ url: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=600&q=80' }],
      bookingLink: '#',
    },
    {
      productCode: 'MOCK006',
      title: `Spice Market & Cooking Class`,
      description: `Visit a local spice market, learn about Indian spices, and cook an authentic meal with a home chef.`,
      duration: '5 hours',
      price: { amount: 65, currency: 'USD' },
      rating: 4.9,
      reviewCount: 412,
      images: [{ url: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?w=600&q=80' }],
      bookingLink: '#',
    },
  ];

  return mockExperiences.slice(0, params.limit || 6);
}

export function getDestinationId(city: string): number | undefined {
  return DESTINATIONS[city.toLowerCase() as keyof typeof DESTINATIONS]?.id;
}
