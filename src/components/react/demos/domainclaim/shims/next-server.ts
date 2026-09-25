// Port shim for `next/server`. Route handlers build NextResponse and read a NextRequest; both are
// the platform Response and Request underneath, plus the few members the handlers use.

type CookieJar = { set: (...args: unknown[]) => void; getAll: () => { name: string; value: string }[] };

export class NextResponse extends Response {
  readonly cookies: CookieJar = { set: () => {}, getAll: () => [] };

  static json(body: unknown, init?: ResponseInit): NextResponse {
    const headers = new Headers(init?.headers);
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }
    return new NextResponse(JSON.stringify(body), { ...init, headers });
  }
}

/**
 * What the route handlers read from a request. Built by the in-page router rather than with
 * `new Request`, because a browser drops the Origin and Host headers from a Request it constructs,
 * and the handlers' same-origin check reads both.
 */
export type NextRequest = {
  url: string;
  method: string;
  headers: Headers;
  nextUrl: URL;
  cookies: CookieJar;
  json: () => Promise<unknown>;
};
