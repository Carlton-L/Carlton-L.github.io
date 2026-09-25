// Port shim for `next/navigation`. The demo runs inside a frame on another site, so routing stays
// in memory: pushing a history entry here would add steps to the visitor's Back button.
import { useMemo, useSyncExternalStore } from 'react';

type Location = { pathname: string; search: string };

let location: Location = { pathname: '/', search: '' };
const listeners = new Set<() => void>();

const split = (href: string): Location => {
  const url = new URL(href, 'https://demo.invalid');
  return { pathname: url.pathname, search: url.search };
};

export const navigate = (href: string, _replace = false) => {
  location = split(href);
  for (const listener of listeners) {
    listener();
  }
  window.scrollTo(0, 0);
};

/** The demo's own entry point sets where the app starts. */
export const startAt = (href: string) => {
  location = split(href);
};

export const subscribeLocation = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useLocation = (): Location =>
  useSyncExternalStore(
    subscribeLocation,
    () => location,
    () => location,
  );

export const usePathname = (): string => useLocation().pathname;

export const useSearchParams = (): URLSearchParams => {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
};

/** The app's two dynamic routes: /claim/[id], and nothing else takes a param. */
export const useParams = <T extends Record<string, string>>(): T => {
  const { pathname } = useLocation();
  return useMemo(() => {
    const match = /^\/claim\/([^/]+)$/.exec(pathname);
    return (match ? { id: match[1] } : {}) as T;
  }, [pathname]);
};

const router = {
  push: (href: string) => navigate(href),
  replace: (href: string) => navigate(href, true),
  back: () => {},
  forward: () => {},
  refresh: () => {},
  prefetch: () => {},
};

export const useRouter = () => router;

export const redirect = (href: string) => navigate(href, true);
export const notFound = () => {
  throw new Error('not found');
};
