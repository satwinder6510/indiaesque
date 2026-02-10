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

// Destination IDs for Indian cities - NEED TO VERIFY THESE!
// 684 was Las Vegas - these IDs need to be looked up from Viator's destinations endpoint
export const DESTINATIONS = {
  delhi: { id: 0, name: 'Delhi' },  // TODO: Look up correct ID
  jaipur: { id: 0, name: 'Jaipur' },
  mumbai: { id: 0, name: 'Mumbai' },
  goa: { id: 0, name: 'Goa' },
  agra: { id: 0, name: 'Agra' },
  varanasi: { id: 0, name: 'Varanasi' },
  kolkata: { id: 0, name: 'Kolkata' },
  udaipur: { id: 0, name: 'Udaipur' },
  kerala: { id: 0, name: 'Kerala' },
};

// Function to look up destinations from Viator
export async function lookupDestination(searchTerm: string): Promise<any[]> {
  if (!VIATOR_API_KEY) {
    console.warn('Viator API key not configured');
    return [];
  }

  try {
    // Try the destinations endpoint (v1 style)
    const response = await fetch(`${VIATOR_BASE_URL}/v1/taxonomy/destinations`, {
      method: 'GET',
      headers: {
        'exp-api-key': VIATOR_API_KEY,
        'Accept': 'application/json;version=2.0',
        'Accept-Language': 'en-US',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Viator destinations error:', response.status, errorText);
      return [];
    }

    const data = await response.json();
    // Filter destinations matching our search term
    const allDests = data.data || data.destinations || data || [];
    const matches = allDests.filter((d: any) =>
      (d.destinationName || d.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    console.log('Found', matches.length, 'destinations matching', searchTerm);
    if (matches.length > 0) {
      console.log('First match:', JSON.stringify(matches[0]));
    }
    return matches;
  } catch (error) {
    console.error('Viator destinations error:', error);
    return [];
  }
}

export interface ViatorImage {
  url: string;
  width: number;
  height: number;
}

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
  imageUrl: string; // Best-fit image for our cards
  imageLarge: string; // Larger image for hero/detail views
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
    // Build request body for Viator API v2
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

    // Add tag filtering if provided and valid
    // Note: Tag IDs must be valid Viator tag IDs - invalid tags return 0 results
    // Disable for now until we have valid tag IDs
    if (params.tagIds && params.tagIds.length > 0) {
      console.log('Tags configured but skipping (need valid IDs):', params.tagIds);
    }

    console.log('Viator API request:', JSON.stringify(requestBody));

    // First, let's try to find the right destination - log what we're searching for
    console.log('Searching for destination ID:', params.destId);

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
      console.error('Viator API response:', response.status, errorText);
      throw new Error(`Viator API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Viator API success, products:', data.products?.length || 0);
    return transformProducts(data.products || []);
  } catch (error) {
    console.error('Viator API error:', error);
    return getMockProducts(params);
  }
}

// Select best image variant for a target width
function selectBestImage(images: any[], targetWidth: number): string {
  if (!images || images.length === 0) {
    return 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&q=80';
  }

  // Find cover image first, or use first image
  const coverImage = images.find((img: any) => img.isCover) || images[0];

  if (!coverImage.variants || coverImage.variants.length === 0) {
    return coverImage.url || 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&q=80';
  }

  // Sort variants by width and find the best fit
  const variants = coverImage.variants.sort((a: any, b: any) => a.width - b.width);

  // Find the smallest variant that's at least as wide as target
  const bestFit = variants.find((v: any) => v.width >= targetWidth);

  // If no variant is large enough, use the largest available
  return bestFit?.url || variants[variants.length - 1]?.url || coverImage.url;
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
    imageUrl: selectBestImage(p.images, 600), // Card size ~600px
    imageLarge: selectBestImage(p.images, 1200), // Hero/detail ~1200px
    bookingLink: `https://www.viator.com/tours/${p.productCode}?pid=YOURPID`,
  }));
}

// Mock data for development/fallback
function getMockProducts(params: SearchParams): ViatorProduct[] {
  const cityName = Object.entries(DESTINATIONS).find(([_, v]) => v.id === params.destId)?.[1]?.name || 'Delhi';

  const mockExperiences: ViatorProduct[] = [
    {
      productCode: 'MOCK001',
      title: `Old ${cityName} Street Food Walk`,
      description: `Explore the hidden culinary gems of ${cityName} with a local guide. Taste authentic street food and learn about the city's rich food culture.`,
      duration: '3 hours',
      price: { amount: 3750, currency: 'INR' },
      rating: 4.8,
      reviewCount: 342,
      imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=80',
      imageLarge: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=1200&q=80',
      bookingLink: '#',
    },
    {
      productCode: 'MOCK002',
      title: `${cityName} Heritage Walking Tour`,
      description: `Discover centuries of history as you walk through ancient streets, monuments, and hidden courtyards with an expert historian.`,
      duration: '4 hours',
      price: { amount: 2900, currency: 'INR' },
      rating: 4.9,
      reviewCount: 567,
      imageUrl: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&q=80',
      imageLarge: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1200&q=80',
      bookingLink: '#',
    },
    {
      productCode: 'MOCK003',
      title: `Sunset Photography Tour in ${cityName}`,
      description: `Capture stunning photos at the most photogenic spots with a professional photographer guide.`,
      duration: '3 hours',
      price: { amount: 4500, currency: 'INR' },
      rating: 4.7,
      reviewCount: 189,
      imageUrl: 'https://images.unsplash.com/photo-1545126922-8f56b5a07e9e?w=600&q=80',
      imageLarge: 'https://images.unsplash.com/photo-1545126922-8f56b5a07e9e?w=1200&q=80',
      bookingLink: '#',
    },
    {
      productCode: 'MOCK004',
      title: `Traditional Craft Workshop`,
      description: `Learn traditional arts and crafts from master artisans. Create your own souvenir to take home.`,
      duration: '2.5 hours',
      price: { amount: 3300, currency: 'INR' },
      rating: 4.6,
      reviewCount: 98,
      imageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&q=80',
      imageLarge: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1200&q=80',
      bookingLink: '#',
    },
    {
      productCode: 'MOCK005',
      title: `${cityName} by Night Bike Tour`,
      description: `Experience the city's nightlife and illuminated monuments on this exciting evening bike tour.`,
      duration: '3.5 hours',
      price: { amount: 4150, currency: 'INR' },
      rating: 4.8,
      reviewCount: 234,
      imageUrl: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=600&q=80',
      imageLarge: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1200&q=80',
      bookingLink: '#',
    },
    {
      productCode: 'MOCK006',
      title: `Spice Market & Cooking Class`,
      description: `Visit a local spice market, learn about Indian spices, and cook an authentic meal with a home chef.`,
      duration: '5 hours',
      price: { amount: 5400, currency: 'INR' },
      rating: 4.9,
      reviewCount: 412,
      imageUrl: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?w=600&q=80',
      imageLarge: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?w=1200&q=80',
      bookingLink: '#',
    },
  ];

  return mockExperiences.slice(0, params.limit || 6);
}

export function getDestinationId(city: string): number | undefined {
  return DESTINATIONS[city.toLowerCase() as keyof typeof DESTINATIONS]?.id;
}
