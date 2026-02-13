// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

// Cities with actual content (exclude placeholder cities from sitemap)
// TODO: Add cities here as content is created (e.g., 'goa', 'udaipur', 'varanasi')
const CONTENT_CITIES = ['delhi', 'mumbai', 'jaipur', 'kolkata'];

export default defineConfig({
  site: 'https://indiaesque.in',
  trailingSlash: 'always',
  output: 'server',
  adapter: cloudflare({
    mode: 'advanced',
    imageService: 'compile',
    routes: {
      extend: {
        exclude: [
          { pattern: '/sitemap-index.xml' },
          { pattern: '/sitemap-0.xml' },
          { pattern: '/sitemap-*.xml' },
        ]
      }
    }
  }),
  integrations: [
    sitemap({
      filter: (page) => {
        const url = new URL(page);
        const path = url.pathname;

        // Allow homepage, about, contact, destinations, journal, staycations
        if (path === '/' ||
            path.startsWith('/about') ||
            path.startsWith('/contact') ||
            path.startsWith('/destinations') ||
            path.startsWith('/journal') ||
            path.startsWith('/staycations')) {
          return true;
        }

        // For city pages, only include cities with content
        const cityMatch = path.match(/^\/([^/]+)\/?/);
        if (cityMatch) {
          const city = cityMatch[1];
          return CONTENT_CITIES.includes(city);
        }

        return true;
      }
    })
  ],
  build: {
    format: 'directory',
  },
});
