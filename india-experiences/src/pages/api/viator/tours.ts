import type { APIRoute } from 'astro';
import { searchProducts } from '../../../lib/viator';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const destinationId = parseInt(url.searchParams.get('destinationId') || '0');
  const tagIdsParam = url.searchParams.get('tagIds');
  const tagIds = tagIdsParam ? tagIdsParam.split(',').map(Number).filter(Boolean) : undefined;

  if (!destinationId) {
    return new Response(JSON.stringify({ error: 'destinationId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const products = await searchProducts({
      destId: destinationId,
      tagIds,
      limit: 6,
    });

    const tours = products.map(p => ({
      title: p.title,
      thumbnailURL: p.imageUrl,
      webURL: p.bookingLink,
      price: p.price.amount,
      rating: p.rating,
      duration: p.duration,
    }));

    return new Response(JSON.stringify({ tours }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Viator API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch tours' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
