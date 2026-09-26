// Port shim for `@/lib/dns/nodeResolver`. A browser cannot send DNS queries. Every `.test` demo name
// goes to the product's scripted resolver, exactly as in production. The demo account's real-site
// claims (carlton.dev, apple.com, microsoft.com) answer from the same scripted resolver with their
// record in place, since the demo can't ask their real nameservers. Any other real domain typed into
// the demo gets the product's own answer for a check that could not run.
import { createFakeResolver, type DnsScript } from '@/lib/dns/fakeResolver';
import type { DnsResolver } from '@/lib/dns/types';

const NAMESERVERS = ['ns1.example-dns.test', 'ns2.example-dns.test'];

const held = new Map<string, DnsScript>();

/** Makes `name` answer with `record` at its challenge label, the way a finished setup would. */
export const holdRecord = (name: string, record: string) => {
  held.set(name, {
    zone: name,
    nameservers: NAMESERVERS,
    servers: {
      'ns1.example-dns.test': { kind: 'records', records: [record] },
      'ns2.example-dns.test': { kind: 'records', records: [record] },
    },
    soaMinTtlSeconds: 300,
  });
};

/** The name the current check is for, set by `check-scope.ts`. */
let current: string | null = null;
export const checking = (name: string | null) => {
  current = name;
};

export const createNodeResolver = (_timeoutMs?: number): DnsResolver => {
  const script = current === null ? undefined : held.get(current);
  if (script === undefined) {
    throw new Error('DNS is not reachable from a browser');
  }
  return createFakeResolver(script);
};
