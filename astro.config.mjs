// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Override with SITE_URL for a preview copy on another domain (canonical, share images).
  site: process.env.SITE_URL || 'https://todomotoboulder.com',
  // Every WordPress URL ends in a slash; keeping it means no redirects are needed.
  trailingSlash: 'always',

  // Node on Windows binds "localhost" to IPv6 only (::1), so anything that resolves
  // localhost to 127.0.0.1 gets "refused to connect". Browsers fall back to IPv4.
  server: { host: '127.0.0.1', port: 4321 },

  integrations: [
    react(),
    sitemap({ filter: (page) => !page.includes('/styleguide/') && !page.includes('/404') }),
  ],

  env: {
    schema: {
      // Public Turnstile widget key. Real key comes from the Cloudflare Pages build
      // environment; .env.development supplies Cloudflare's always-pass test key.
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({ context: 'client', access: 'public' }),
      // Preview copy for the shop to review: no analytics, every page noindex.
      PREVIEW: envField.boolean({ context: 'server', access: 'public', default: false }),
    },
  },

  // Self-hosted at build time; no requests to Google Fonts.
  fonts: [
    {
      name: 'Permanent Marker',
      cssVariable: '--font-marker',
      provider: fontProviders.fontsource(),
      weights: [400],
      styles: ['normal'],
      fallbacks: ['cursive'],
    },
    {
      name: 'Roboto Slab',
      cssVariable: '--font-slab',
      provider: fontProviders.fontsource(),
      weights: ['400 700'],
      styles: ['normal'],
      fallbacks: ['serif'],
    },
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
