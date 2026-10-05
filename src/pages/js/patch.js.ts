import { patchJs } from '../../lib/bundles.js';

export const GET = () => new Response(patchJs, { headers: { 'content-type': 'text/javascript; charset=utf-8' } });
