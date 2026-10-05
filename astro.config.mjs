import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { demoPorts } from './src/components/react/demos/ports.mjs';

// client:settled — hydrate a demo once the page change has finished (src/lib/client-settled.js).
const settled = {
  name: 'client-settled',
  hooks: {
    'astro:config:setup': ({ addClientDirective }) => {
      addClientDirective({ name: 'settled', entrypoint: fileURLToPath(new URL('./src/lib/client-settled.js', import.meta.url)) });
    },
  },
};

export default defineConfig({
  site: 'https://carlton.dev',

  // Hover prefetches a link on desktop. The nav routes are fetched as soon as they are on screen
  // (data-astro-prefetch="viewport"), and touch fetches on touchstart (Base.astro).
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },

  integrations: [
    settled,
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
