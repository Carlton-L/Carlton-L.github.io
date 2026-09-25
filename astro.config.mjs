import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { demoPorts } from './src/components/react/demos/ports.mjs';

export default defineConfig({
  site: 'https://carlton.dev',

  integrations: [
    react(),
    // Demo frames are documents a case study embeds, not pages to land on.
    sitemap({ filter: (page) => !page.includes('/demos/') }),
  ],

  vite: {
    plugins: [demoPorts(), tailwindcss()],
    ssr: {
      noExternal: ['three'],
    },
  },
});
