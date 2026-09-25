// Port shim for `@/lib/claims/store`: the same exported functions over an in-memory table instead
// of Postgres. Each write keeps its product condition (the status it was conditional on, the owner
// scope, the owned-name unique index), because those conditions are what the screens react to.
// Types are the product's own, re-exported from the vendored module.
import { CLAIM_LIMIT, TOKEN_TTL_MS } from '@/lib/claims/config';
import { isExpired } from '@/lib/claims/evaluate';
import { holdsTheName, OWNED_STATUSES } from '@/lib/claims/state';
import { generateToken } from '@/lib/claims/token';

export type {
  Claim,
  ClaimSummary,
  ClaimWrite,
  CreateOutcome,
  MoveOutcome,
  VerifyOutcome,
} from '../vendor/src/lib/claims/store';

import type {
  Claim,
  ClaimSummary,
  CreateOutcome,
  MoveOutcome,
  VerifyOutcome,
} from '../vendor/src/lib/claims/store';

let rows: Claim[] = [];

/** Empties the table. The demo calls it before each scene so every claim starts fresh. */
export const resetStore = () => {
  rows = [];
};

/** Puts a verified claim on `name` under another account, so held-by-another is reachable. */
export const seedHeldElsewhere = (name: string, now = new Date()) => {
  rows.push({
    id: crypto.randomUUID(),
    ownerId: '00000000-0000-4000-8000-0000000000aa',
    name,
    registrableDomain: name,
    token: generateToken(),
    status: 'verified',
    issuedAt: new Date(now.getTime() - 9 * 86_400_000),
    expiresAt: new Date(now.getTime() - 2 * 86_400_000),
    verifiedAt: new Date(now.getTime() - 9 * 86_400_000),
    failingSince: null,
    actionNeededSince: null,
    lastCheckedAt: null,
    dnsHost: null,
  });
};

const owned = (id: string, ownerId: string) =>
  rows.find((row) => row.id === id && row.ownerId === ownerId) ?? null;

/** The partial unique index: one row in a holding state per name. */
const indexRefuses = (row: Claim) =>
  rows.some(
    (other) =>
      other !== row &&
      other.name === row.name &&
      (OWNED_STATUSES as readonly string[]).includes(other.status),
  );

const ownClaimFor = (ownerId: string, name: string): Claim | null => {
  const mine = rows.filter((row) => row.ownerId === ownerId && row.name === name);
  return (
    mine.find((row) => holdsTheName(row.status)) ??
    mine.find((row) => row.status === 'pending') ??
    null
  );
};

export const createClaim = async (input: {
  ownerId: string;
  name: string;
  registrableDomain: string;
  now?: Date;
  tokenLifetimeMs?: number;
}): Promise<CreateOutcome> => {
  const now = input.now ?? new Date();
  const lifetime = input.tokenLifetimeMs ?? TOKEN_TTL_MS;
  const existing = ownClaimFor(input.ownerId, input.name);
  if (existing !== null) {
    if (existing.status === 'pending' && isExpired(existing, now)) {
      existing.token = generateToken();
      existing.issuedAt = now;
      existing.expiresAt = new Date(now.getTime() + TOKEN_TTL_MS);
      return { outcome: 'existing', id: existing.id, reissued: true };
    }
    return { outcome: 'existing', id: existing.id, reissued: false };
  }
  const recent = rows.filter(
    (row) =>
      row.ownerId === input.ownerId &&
      row.issuedAt.getTime() > now.getTime() - CLAIM_LIMIT.windowSeconds * 1000,
  );
  if (recent.length >= CLAIM_LIMIT.max) {
    return { outcome: 'limited' };
  }
  const id = crypto.randomUUID();
  rows.push({
    id,
    ownerId: input.ownerId,
    name: input.name,
    registrableDomain: input.registrableDomain,
    token: generateToken(),
    status: 'pending',
    issuedAt: now,
    expiresAt: new Date(now.getTime() + lifetime),
    verifiedAt: null,
    failingSince: null,
    actionNeededSince: null,
    lastCheckedAt: null,
    dnsHost: null,
  });
  return { outcome: 'created', id };
};

export const claimForOwner = async (id: string, ownerId: string): Promise<Claim | null> => {
  const row = owned(id, ownerId);
  return row === null ? null : { ...row };
};

export const claimsForOwner = async (ownerId: string): Promise<ClaimSummary[]> =>
  rows
    .filter((row) => row.ownerId === ownerId)
    .sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime())
    .map(({ id, name, status, verifiedAt, expiresAt, failingSince, actionNeededSince, issuedAt, lastCheckedAt, dnsHost }) => ({
      id,
      name,
      status,
      verifiedAt,
      expiresAt,
      failingSince,
      actionNeededSince,
      issuedAt,
      lastCheckedAt,
      dnsHost,
    }));

export const heldByAnother = async (name: string, ownerId: string): Promise<boolean> =>
  rows.some(
    (row) =>
      row.name === name &&
      row.ownerId !== ownerId &&
      (OWNED_STATUSES as readonly string[]).includes(row.status),
  );

export const deleteClaim = async (id: string, ownerId: string): Promise<boolean> => {
  const before = rows.length;
  rows = rows.filter((row) => !(row.id === id && row.ownerId === ownerId));
  return rows.length < before;
};

export const markVerified = async (id: string, ownerId: string, at: Date): Promise<VerifyOutcome> => {
  const row = owned(id, ownerId);
  if (row === null || row.status !== 'pending') {
    return 'unchanged';
  }
  if (indexRefuses(row)) {
    return 'held_by_another';
  }
  row.status = 'verified';
  row.verifiedAt = at;
  row.actionNeededSince = null;
  return 'verified';
};

export const markAtRisk = async (id: string, ownerId: string, at: Date): Promise<MoveOutcome<'at_risk'>> => {
  const row = owned(id, ownerId);
  if (row === null || row.status !== 'verified') {
    return 'unchanged';
  }
  row.status = 'at_risk';
  row.failingSince = at;
  return 'at_risk';
};

export const markRecovered = async (id: string, ownerId: string): Promise<MoveOutcome<'recovered'>> => {
  const row = owned(id, ownerId);
  if (row === null || row.status !== 'at_risk') {
    return 'unchanged';
  }
  row.status = 'verified';
  row.failingSince = null;
  return 'recovered';
};

export const flagActionNeeded = async (id: string, ownerId: string, at: Date): Promise<MoveOutcome<'action_needed'>> => {
  const row = owned(id, ownerId);
  if (row === null || row.status !== 'pending' || row.actionNeededSince !== null) {
    return 'unchanged';
  }
  row.actionNeededSince = at;
  return 'action_needed';
};

export const clearActionNeeded = async (id: string, ownerId: string): Promise<MoveOutcome<'action_cleared'>> => {
  const row = owned(id, ownerId);
  if (row === null || row.status !== 'pending' || row.actionNeededSince === null) {
    return 'unchanged';
  }
  row.actionNeededSince = null;
  return 'action_cleared';
};

export const recordObservation = async (
  id: string,
  ownerId: string,
  observation: { checkedAt: Date; dnsHost: string | null },
): Promise<void> => {
  const row = owned(id, ownerId);
  if (row !== null) {
    row.lastCheckedAt = observation.checkedAt;
    row.dnsHost = observation.dnsHost;
  }
};
