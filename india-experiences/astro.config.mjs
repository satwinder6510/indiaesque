// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://indiaesque.com',
  trailingSlash: 'always',
  output: 'server',
  adapter: cloudflare({
    mode: 'advanced'
  }),
  integrations: [sitemap()],
  build: {
    format: 'directory',
  },
});
