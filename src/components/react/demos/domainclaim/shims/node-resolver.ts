// Port shim for `@/lib/dns/nodeResolver`. A browser cannot send DNS queries, so a real domain
// typed into the demo gets the product's own answer for a check that could not run. Every
// `.test` demo name goes to the product's scripted resolver instead, exactly as in production.
import type { DnsResolver } from '@/lib/dns/types';

export const createNodeResolver = (_timeoutMs?: number): DnsResolver => {
  throw new Error('DNS is not reachable from a browser');
};
