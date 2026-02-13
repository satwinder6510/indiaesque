// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

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
  integrations: [sitemap()],
  build: {
    format: 'directory',
  },
});
