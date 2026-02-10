// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://indiaesque.com',
  trailingSlash: 'always',
  output: 'server',
  adapter: vercel(),
  integrations: [sitemap()],
  build: {
    format: 'directory',
  },
});
