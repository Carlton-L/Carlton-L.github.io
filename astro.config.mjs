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

  // Every page is a folder with an index.html, and GitHub Pages redirects /about to /about/.
  // Internal links end in a slash so they skip that redirect. With 'always' the dev server
  // answers 404 to a link that forgets it, and tests/built/dist.test.mjs fails the build.
  trailingSlash: 'always',

  // Pages are fetched early by src/lib/warm.js, which also fetches their stylesheets.
  prefetch: false,

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
