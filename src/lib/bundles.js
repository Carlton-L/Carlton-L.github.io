/**
 * The site's shared scripts, built once and served as cached files so pages do not carry them.
 *
 *   /js/patch.js   patch-runtime.js (window.Patch) + patch-field.js (the network)
 *   /js/previs.js  previs.js (window.Previs), for the pages with a work index
 *   clockJs        page-clock.js, wrapped as a plain script. Base.astro inlines it in the head.
 *
 * The endpoints are in src/pages/js/. The ?v= tag changes when the code does.
 * In dev the code is served as written, with the runtime's DEV checks switched on.
 * In a build the runtime's dev-only blocks are cut and both files are minified.
 */
import { transform } from 'esbuild';
import { createHash } from 'node:crypto';
import runtime from './patch-runtime.js?raw';
import field from './patch-field.js?raw';
import previs from './previs.js?raw';
import clock from './page-clock.js?raw';

const DEV = import.meta.env.DEV;
const minify = async (code) => (DEV ? code : (await transform(code, { minify: true, target: 'es2020' })).code);
const tag = (code) => createHash('sha1').update(code).digest('hex').slice(0, 8);

const rt = DEV
  ? runtime.replace('var DEV = false; // @dev', 'var DEV = true; // @dev')
  : runtime.replace(/\/\/<dev[\s\S]*?\/\/>dev/g, '');

export const patchJs = await minify(rt + '\n' + field);
export const previsJs = await minify(previs);
export const patchSrc = '/js/patch.js?v=' + tag(patchJs);
export const previsSrc = '/js/previs.js?v=' + tag(previsJs);
export const clockJs = (await transform(clock, { format: 'iife', minify: !DEV, target: 'es2020' })).code.trim();
