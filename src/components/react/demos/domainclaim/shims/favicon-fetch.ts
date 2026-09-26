// Port shim for `@/lib/favicon/fetch`. The product's server fetches a claimed site's own icon:
// `/favicon.ico` first, then the icons its home page links to, raster images only. A browser can
// read one site without asking that site's permission: the one it is on. So the demo runs the
// product's search, with the product's own link parser and type check, for the site that serves
// it, and every other name gets the product's answer for a site with no icon: the globe.
import { acceptableIcon, iconLinks, MAX_ICON_BYTES, MAX_PAGE_BYTES, mediaType } from '@/lib/favicon/icons';

export type Icon = { contentType: string; body: ArrayBuffer };

/** The name of the site serving the demo. Local previews stand in for it. */
const SELF = 'carlton.dev';

const get = async (path: string, maxBytes: number) => {
  try {
    const response = await fetch(path, { redirect: 'follow' });
    if (!response.ok) {
      return null;
    }
    const body = await response.arrayBuffer();
    return { contentType: response.headers.get('content-type'), body: body.slice(0, maxBytes + 1), url: response.url };
  } catch {
    return null;
  }
};

const asIcon = (got: Awaited<ReturnType<typeof get>>): Icon | null =>
  got !== null && acceptableIcon(got.contentType, got.body.byteLength)
    ? { contentType: mediaType(got.contentType), body: got.body }
    : null;

export const fetchFavicon = async (name: string): Promise<Icon | null> => {
  if (name !== SELF) {
    return null;
  }
  const direct = asIcon(await get('/favicon.ico', MAX_ICON_BYTES));
  if (direct !== null) {
    return direct;
  }
  const page = await get('/', MAX_PAGE_BYTES);
  if (page === null || mediaType(page.contentType) !== 'text/html') {
    return null;
  }
  const html = new TextDecoder().decode(page.body.slice(0, MAX_PAGE_BYTES));
  for (const link of iconLinks(html, page.url).slice(0, 2)) {
    const url = new URL(link);
    if (url.origin !== window.location.origin) {
      continue;
    }
    const icon = asIcon(await get(url.pathname, MAX_ICON_BYTES));
    if (icon !== null) {
      return icon;
    }
  }
  return null;
};
