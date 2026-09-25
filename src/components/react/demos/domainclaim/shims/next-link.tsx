// Port shim for `next/link`: an anchor that moves the demo's in-memory router instead of the page.
import type React from 'react';
import { forwardRef } from 'react';
import { navigate } from './next-navigation';

type LinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string | { pathname?: string; query?: Record<string, string> };
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
};

const toHref = (href: LinkProps['href']): string => {
  if (typeof href === 'string') {
    return href;
  }
  const query = href.query ? `?${new URLSearchParams(href.query).toString()}` : '';
  return `${href.pathname ?? ''}${query}`;
};

const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ href, prefetch: _prefetch, replace, scroll: _scroll, onClick, ...rest }, ref) => {
    const target = toHref(href);
    return (
      <a
        ref={ref}
        href={target}
        {...rest}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) {
            if (!event.defaultPrevented) {
              event.preventDefault();
            }
            return;
          }
          event.preventDefault();
          navigate(target, replace === true);
        }}
      />
    );
  },
);
Link.displayName = 'Link';

export default Link;
