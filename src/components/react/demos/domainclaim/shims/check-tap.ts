// Observation seam on `@/lib/claims/check`. Everything is the product's module; `runCheck` is
// wrapped only to hand what it decided (the typed result and where it left the claim) to the
// case study's "what the code decided" pane. The value returned to the route is untouched.
import * as product from '../vendor/src/lib/claims/check';

export * from '../vendor/src/lib/claims/check';

type Outcome = Awaited<ReturnType<typeof product.runCheck>>;
let listener: (claimId: string, outcome: Outcome) => void = () => {};

export const onOutcome = (next: typeof listener) => {
  listener = next;
};

export const runCheck: typeof product.runCheck = async (claim, now, hooks) => {
  const outcome = await product.runCheck(claim, now, hooks);
  listener(claim.id, outcome);
  return outcome;
};
