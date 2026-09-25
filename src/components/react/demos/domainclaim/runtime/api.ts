// The demo's server: the product's own route handlers, answering `fetch` inside the demo's
// document instead of over the network. Portfolio-owned glue; every handler it calls is vendored
// unchanged from the product.
import { GET as getClaim } from '../vendor/src/app/api/claims/[id]/route';
import { POST as postCheck } from '../vendor/src/app/api/claims/[id]/check/route';
import { POST as postRelease } from '../vendor/src/app/api/claims/[id]/release/route';
import { GET as getClaims, POST as postClaims } from '../vendor/src/app/api/claims/route';
import { GET as getMe } from '../vendor/src/app/api/me/route';
import { onOutcome } from '../shims/check-tap';
import type { NextRequest } from '../shims/next-server';

type Handler = (request: NextRequest, context: { params: Promise<{ id: string }> }) => Promise<Response>;

const ROUTES: { method: string; pattern: RegExp; handler: Handler }[] = [
  { method: 'GET', pattern: /^\/api\/me$/, handler: getMe as Handler },
  { method: 'GET', pattern: /^\/api\/claims$/, handler: getClaims as Handler },
  { method: 'POST', pattern: /^\/api\/claims$/, handler: postClaims as Handler },
  { method: 'GET', pattern: /^\/api\/claims\/([^/]+)$/, handler: getClaim as Handler },
  { method: 'POST', pattern: /^\/api\/claims\/([^/]+)\/check$/, handler: postCheck as Handler },
  { method: 'POST', pattern: /^\/api\/claims\/([^/]+)\/release$/, handler: postRelease as Handler },
];

/** What one check decided, as the product's own values, plus the steps it streamed. */
export type CheckRecord = { claimId: string; events: unknown[]; decided: unknown };
export type CheckTap = (record: CheckRecord) => void;

let tap: CheckTap = () => {};
const decided = new Map<string, unknown>();
export const onCheck = (listener: CheckTap) => {
  tap = listener;
};
onOutcome((claimId, outcome) => {
  decided.set(claimId, {
    result: outcome.result,
    status: outcome.status,
    provedButHeld: outcome.provedButHeld,
    recovered: outcome.recovered,
    actionNeeded: outcome.actionNeeded,
  });
});

/** A real network round trip is part of what the screen was designed around, so keep one. */
const LATENCY_MS = 90;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const requestFor = (url: URL, init: RequestInit | undefined): NextRequest => {
  // A standalone Headers object keeps Origin and Host, which the handlers' same-origin check reads.
  const headers = new Headers(init?.headers);
  headers.set('origin', window.location.origin);
  headers.set('host', window.location.host);
  const body = typeof init?.body === 'string' ? init.body : null;
  return {
    url: url.toString(),
    method: (init?.method ?? 'GET').toUpperCase(),
    headers,
    nextUrl: url,
    cookies: { set: () => {}, getAll: () => [] },
    json: async () => {
      if (body === null) {
        throw new SyntaxError('empty body');
      }
      return JSON.parse(body) as unknown;
    },
  };
};

/** Copies a streamed check line by line to the tap, and passes the stream on untouched. */
const tapStream = (response: Response, claimId: string): Response => {
  if (response.body === null || !(response.headers.get('content-type') ?? '').includes('ndjson')) {
    return response;
  }
  const [forScreen, forTap] = response.body.tee();
  const events: unknown[] = [];
  void (async () => {
    const reader = forTap.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      buffer += value;
      let cut = buffer.indexOf('\n');
      while (cut >= 0) {
        const line = buffer.slice(0, cut).trim();
        buffer = buffer.slice(cut + 1);
        if (line) {
          events.push(JSON.parse(line));
        }
        cut = buffer.indexOf('\n');
      }
    }
    tap({ claimId, events, decided: decided.get(claimId) ?? null });
    decided.delete(claimId);
  })();
  return new Response(forScreen, { status: response.status, headers: response.headers });
};

export const installApi = () => {
  const network = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, window.location.href);
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) {
      return network(input, init);
    }
    const method = (init?.method ?? 'GET').toUpperCase();
    await wait(LATENCY_MS);
    if (url.pathname === '/api/signout') {
      return Response.json({ ok: true });
    }
    for (const route of ROUTES) {
      const match = route.method === method ? route.pattern.exec(url.pathname) : null;
      if (match) {
        const id = match[1] ?? '';
        const response = await route.handler(requestFor(url, init), { params: Promise.resolve({ id }) });
        return route.pattern.source.includes('check') ? tapStream(response, id) : response;
      }
    }
    return Response.json({ ok: false, error: 'not_found' }, { status: 404 });
  };
};
