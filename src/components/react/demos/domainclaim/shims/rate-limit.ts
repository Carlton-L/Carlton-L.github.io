// Port shim for `@/lib/claims/rateLimit`: the product's two sliding windows (per claim and per
// account, from its own config) counted in memory instead of in Postgres.
import { CHECK_LIMITS } from '@/lib/claims/config';
import type { CheckDecision } from '../vendor/src/lib/claims/rateLimit';

export type { CheckDecision };

let attempts: { ownerId: string; claimId: string; at: number }[] = [];

export const resetAttempts = () => {
  attempts = [];
};

export const recordCheckAttempt = async (ownerId: string, claimId: string): Promise<CheckDecision> => {
  const now = Date.now();
  attempts = attempts.filter((a) => a.at > now - CHECK_LIMITS.perAccount.windowSeconds * 1000);
  const perClaim = attempts.filter(
    (a) => a.claimId === claimId && a.at > now - CHECK_LIMITS.perClaim.windowSeconds * 1000,
  );
  const perAccount = attempts.filter((a) => a.ownerId === ownerId);
  if (perClaim.length < CHECK_LIMITS.perClaim.max && perAccount.length < CHECK_LIMITS.perAccount.max) {
    attempts.push({ ownerId, claimId, at: now });
    return { outcome: 'allowed' };
  }
  const oldest = (list: typeof attempts, windowSeconds: number) =>
    list.length === 0 ? 0 : Math.min(...list.map((a) => a.at)) + windowSeconds * 1000;
  const resume = Math.max(
    perClaim.length >= CHECK_LIMITS.perClaim.max ? oldest(perClaim, CHECK_LIMITS.perClaim.windowSeconds) : 0,
    perAccount.length >= CHECK_LIMITS.perAccount.max ? oldest(perAccount, CHECK_LIMITS.perAccount.windowSeconds) : 0,
  );
  return { outcome: 'limited', resumeAt: new Date(resume) };
};
