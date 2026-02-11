import type { APIRoute } from 'astro';
import { searchAttractions } from '../../../lib/viator';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const destinationId = parseInt(url.searchParams.get('destinationId') || '0');

  if (!destinationId) {
    return new Response(JSON.stringify({ error: 'destinationId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const attractions = await searchAttractions({
      destId: destinationId,
      limit: 6,
    });

    return new Response(JSON.stringify({ attractions }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Viator Attractions error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch attractions' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
