// Seam on `@/lib/claims/check`. Everything is the product's module; `runCheck` is wrapped only to
// tell the resolver shim which name is being checked, so a real-site claim of the demo account can
// answer with its record in place while any other real domain still gets "the check could not run".
// The value returned to the route is untouched.
import * as product from '../vendor/src/lib/claims/check';
import { checking } from './node-resolver';

export * from '../vendor/src/lib/claims/check';

export const runCheck: typeof product.runCheck = async (claim, now, hooks) => {
  checking(claim.name);
  try {
    return await product.runCheck(claim, now, hooks);
  } finally {
    checking(null);
  }
};
