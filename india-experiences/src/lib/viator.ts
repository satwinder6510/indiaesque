// Viator API Service - Products endpoint

const VIATOR_API_KEY = import.meta.env.VIATOR_API_KEY || process.env.VIATOR_API_KEY || '';
const VIATOR_BASE_URL = 'https://api.viator.com/partner';

// All Indian city destination IDs from GET /partner/destinations (refreshed 2026-02-11)
// Parent: India (723). Section hides automatically when a city has 0 products.
export const DESTINATIONS: Record<string, { id: number; name: string }> = {
  agra: { id: 4547, name: 'Agra' },
  ahmedabad: { id: 24558, name: 'Ahmedabad' },
  ajmer: { id: 51525, name: 'Ajmer' },
  allahabad: { id: 50898, name: 'Allahabad' },
  alwar: { id: 50429, name: 'Alwar' },
  amritsar: { id: 22306, name: 'Amritsar' },
  aurangabad: { id: 23226, name: 'Aurangabad' },
  ayodhya: { id: 51586, name: 'Ayodhya' },
  bagdogra: { id: 50262, name: 'Bagdogra' },
  bangalore: { id: 5310, name: 'Bangalore' },
  bhopal: { id: 24530, name: 'Bhopal' },
  bhubaneswar: { id: 25191, name: 'Bhubaneswar' },
  bikaner: { id: 50339, name: 'Bikaner' },
  'bodh-gaya': { id: 50423, name: 'Bodh Gaya' },
  bundi: { id: 51594, name: 'Bundi' },
  chandigarh: { id: 24420, name: 'Chandigarh' },
  chennai: { id: 4624, name: 'Chennai' },
  chittaurgarh: { id: 50428, name: 'Chittaurgarh' },
  coimbatore: { id: 26228, name: 'Coimbatore' },
  darjeeling: { id: 22035, name: 'Darjeeling' },
  delhi: { id: 804, name: 'Delhi' },
  dharamsala: { id: 25979, name: 'Dharamsala' },
  dibrugarh: { id: 51678, name: 'Dibrugarh' },
  dimapur: { id: 52181, name: 'Dimapur' },
  gaya: { id: 51535, name: 'Gaya' },
  goa: { id: 4594, name: 'Goa' },
  guwahati: { id: 24307, name: 'Guwahati' },
  gwalior: { id: 24829, name: 'Gwalior' },
  hampi: { id: 50426, name: 'Hampi' },
  haridwar: { id: 22303, name: 'Haridwar' },
  harji: { id: 50338, name: 'Harji' },
  'havelock-island': { id: 50422, name: 'Havelock Island' },
  hyderabad: { id: 22442, name: 'Hyderabad' },
  indore: { id: 24026, name: 'Indore' },
  jabalpur: { id: 50921, name: 'Jabalpur' },
  jaipur: { id: 4627, name: 'Jaipur' },
  jaisalmer: { id: 24761, name: 'Jaisalmer' },
  jhansi: { id: 50261, name: 'Jhansi' },
  jodhpur: { id: 22142, name: 'Jodhpur' },
  kannur: { id: 23640, name: 'Kannur' },
  kerala: { id: 964, name: 'Kerala' },
  khajuraho: { id: 25032, name: 'Khajuraho' },
  kochi: { id: 952, name: 'Kochi' },
  kodaikanal: { id: 50888, name: 'Kodaikanal' },
  kolkata: { id: 4924, name: 'Kolkata' },
  leh: { id: 22569, name: 'Leh' },
  lucknow: { id: 23770, name: 'Lucknow' },
  madurai: { id: 26847, name: 'Madurai' },
  manali: { id: 22496, name: 'Manali' },
  mangalore: { id: 4625, name: 'Mangalore' },
  'mount-abu': { id: 50337, name: 'Mount Abu' },
  mumbai: { id: 953, name: 'Mumbai' },
  munnar: { id: 25293, name: 'Munnar' },
  mysore: { id: 25746, name: 'Mysore' },
  nagpur: { id: 50881, name: 'Nagpur' },
  nainital: { id: 50425, name: 'Nainital' },
  nanded: { id: 51551, name: 'Nanded' },
  nashik: { id: 50879, name: 'Nashik' },
  orccha: { id: 50857, name: 'Orccha' },
  patna: { id: 50874, name: 'Patna' },
  pelling: { id: 50858, name: 'Pelling' },
  pondicherry: { id: 22690, name: 'Pondicherry' },
  'port-blair': { id: 50896, name: 'Port Blair' },
  pune: { id: 26473, name: 'Pune' },
  pushkar: { id: 50259, name: 'Pushkar' },
  rajkot: { id: 50913, name: 'Rajkot' },
  'ranthambore-national-park': { id: 50260, name: 'Ranthambore National Park' },
  rishikesh: { id: 22733, name: 'Rishikesh' },
  'sasan-gir': { id: 50424, name: 'Sasan Gir' },
  'sawai-madhopur': { id: 50258, name: 'Sawai Madhopur' },
  shillong: { id: 51511, name: 'Shillong' },
  shimla: { id: 25944, name: 'Shimla' },
  shirdi: { id: 50890, name: 'Shirdi' },
  srinagar: { id: 23017, name: 'Srinagar' },
  thanjavur: { id: 27741, name: 'Thanjavur' },
  thekkady: { id: 50427, name: 'Thekkady' },
  tiruvannamalai: { id: 51534, name: 'Tiruvannamalai' },
  trivandrum: { id: 4629, name: 'Trivandrum' },
  udaipur: { id: 5106, name: 'Udaipur' },
  vadodara: { id: 50883, name: 'Vadodara' },
  varanasi: { id: 22015, name: 'Varanasi' },
  visakhapatnam: { id: 51509, name: 'Visakhapatnam' },
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
  tagIds?: number[];
}

// India country destination ID
export const INDIA_DESTINATION_ID = 723;

export async function searchProducts(params: SearchParams): Promise<ViatorProduct[]> {
  if (!VIATOR_API_KEY) {
    console.warn('Viator API key not configured, skipping');
    return [];
  }

  try {
    const filtering: any = {
      destination: params.destId,
    };

    if (params.tagIds && params.tagIds.length > 0) {
      filtering.tags = params.tagIds;
    }

    const requestBody: any = {
      filtering,
      pagination: {
        start: 1,
        count: params.limit || 6,
      },
      currency: 'INR',
    };

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
  // Try slug match first (e.g. "jaipur"), then name match (e.g. "Jaipur")
  const bySlug = DESTINATIONS[city.toLowerCase()];
  if (bySlug) return bySlug.id;
  const lower = city.toLowerCase();
  const entry = Object.values(DESTINATIONS).find(d => d.name.toLowerCase() === lower);
  return entry?.id;
}
