import { previsJs } from '../../lib/bundles.js';

export const GET = () => new Response(previsJs, { headers: { 'content-type': 'text/javascript; charset=utf-8' } });
