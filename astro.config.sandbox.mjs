// Sandbox-only build config: redirects vite cache + output off the mounted volume.
// Used by Claude's sandboxed builds; safe to delete.
import baseConfig from './astro.config.mjs';
export default {
  ...baseConfig,
  outDir: '/tmp/astro-dist',
  cacheDir: '/tmp/astro-cache',
  vite: { ...baseConfig.vite, cacheDir: '/tmp/vite-cache' },
};
