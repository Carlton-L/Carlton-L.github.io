// The demo's server: the product's own route handlers, answering `fetch` inside the demo's
// document instead of over the network. Portfolio-owned glue; every handler it calls is vendored
// unchanged from the product.
import { GET as getClaim } from '../vendor/src/app/api/claims/[id]/route';
import { POST as postCheck } from '../vendor/src/app/api/claims/[id]/check/route';
import { POST as postRelease } from '../vendor/src/app/api/claims/[id]/release/route';
import { GET as getClaims, POST as postClaims } from '../vendor/src/app/api/claims/route';
import { GET as getFavicon } from '../vendor/src/app/api/favicon/[id]/route';
import { GET as getMe } from '../vendor/src/app/api/me/route';
import type { NextRequest } from '../shims/next-server';

type Handler = (request: NextRequest, context: { params: Promise<{ id: string }> }) => Promise<Response>;

const ROUTES: { method: string; pattern: RegExp; handler: Handler }[] = [
  { method: 'GET', pattern: /^\/api\/me$/, handler: getMe as Handler },
  { method: 'GET', pattern: /^\/api\/claims$/, handler: getClaims as Handler },
  { method: 'POST', pattern: /^\/api\/claims$/, handler: postClaims as Handler },
  { method: 'GET', pattern: /^\/api\/claims\/([^/]+)$/, handler: getClaim as Handler },
  { method: 'POST', pattern: /^\/api\/claims\/([^/]+)\/check$/, handler: postCheck as Handler },
  { method: 'POST', pattern: /^\/api\/claims\/([^/]+)\/release$/, handler: postRelease as Handler },
  { method: 'GET', pattern: /^\/api\/favicon\/([^/]+)$/, handler: getFavicon as Handler },
];

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
        return route.handler(requestFor(url, init), { params: Promise.resolve({ id }) });
      }
    }
    return Response.json({ ok: false, error: 'not_found' }, { status: 404 });
  };
  installImages();
};

/**
 * The product shows a claim's icon with a plain `<img src="/api/favicon/:id">`. An image request
 * never goes through `fetch`, so the demo answers it here: the same route handler, its bytes handed
 * to the image as a blob. A miss becomes an image that fails, which the product shows as the globe.
 * React sets an image's `src` twice, as an attribute and then as a property, so both are covered.
 */
const FAVICON = /^\/api\/favicon\/[^/]+$/;
const installImages = () => {
  const setAttribute = Element.prototype.setAttribute;
  const srcProperty = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  const answered = new WeakMap<HTMLImageElement, string>();
  const answer = (image: HTMLImageElement, value: string): boolean => {
    const url = new URL(String(value), window.location.href);
    if (url.origin !== window.location.origin || !FAVICON.test(url.pathname)) {
      return false;
    }
    if (answered.get(image) === url.pathname) {
      return true;
    }
    answered.set(image, url.pathname);
    void (async () => {
      const response = await window.fetch(url.pathname);
      const source = response.ok ? URL.createObjectURL(await response.blob()) : 'data:,';
      setAttribute.call(image, 'src', source);
    })();
    return true;
  };
  Element.prototype.setAttribute = function (this: Element, name: string, value: string) {
    if (this instanceof HTMLImageElement && name === 'src' && answer(this, value)) {
      return;
    }
    setAttribute.call(this, name, value);
  };
  if (srcProperty?.set && srcProperty.get) {
    const { get, set } = srcProperty;
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      configurable: true,
      enumerable: srcProperty.enumerable,
      get() {
        return get.call(this);
      },
      set(this: HTMLImageElement, value: string) {
        if (!answer(this, value)) {
          set.call(this, value);
        }
      },
    });
  }
};
