import { defineMiddleware } from 'astro:middleware';
import redirectsData from './data/redirects.json';

// Build a flat map of old URLs to new URLs
const redirectMap = new Map<string, string>();

for (const [city, consolidations] of Object.entries(redirectsData)) {
  for (const [targetSlug, sourceUrls] of Object.entries(consolidations as Record<string, string[]>)) {
    const targetUrl = `/${city}/${targetSlug}/`;
    for (const sourceUrl of sourceUrls) {
      redirectMap.set(sourceUrl, targetUrl);
    }
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;

  // Check if this URL should be redirected
  const redirectTarget = redirectMap.get(pathname);

  if (redirectTarget) {
    // Return 301 permanent redirect
    return context.redirect(redirectTarget, 301);
  }

  // Continue to the page
  return next();
});
