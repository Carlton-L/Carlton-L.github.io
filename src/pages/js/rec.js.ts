import { analyticsJs } from '../../lib/bundles.js';

export const GET = () => new Response(analyticsJs, { headers: { 'content-type': 'text/javascript; charset=utf-8' } });
