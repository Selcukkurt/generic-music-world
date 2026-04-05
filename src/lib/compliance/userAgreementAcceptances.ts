import { AGREEMENT_KEYS, AGREEMENT_VERSIONS, type AgreementKey } from "./constants";

/** Columns commonly selected from `public.user_agreement_acceptances` (matches PostgREST rows). */
export type UserAgreementAcceptanceRow = {
  id?: string;
  user_id?: string;
  agreement_key: string;
  agreement_version: string;
  accepted_at?: string | null;
  revoked_at?: string | null;
  locale?: string | null;
  /** Nullable; omit on insert to use DB default (`onboarding`). */
  acceptance_source?: string | null;
};

export const DEFAULT_AGREEMENT_ACCEPTANCE_SOURCE = "onboarding" as const;

/**
 * Resolves `acceptance_source` for INSERT/UPDATE. Column is nullable; nothing may assume non-null reads.
 * - Both fields omitted → {@link DEFAULT_AGREEMENT_ACCEPTANCE_SOURCE}
 * - Explicit `acceptance_source: null` (or `source: null`) → null
 */
export function resolveAcceptanceSourceForWrite(
  body: { acceptance_source?: string | null; source?: string | null } | null | undefined
): string | null {
  if (body?.acceptance_source !== undefined) return body.acceptance_source;
  if (body?.source !== undefined) return body.source;
  return DEFAULT_AGREEMENT_ACCEPTANCE_SOURCE;
}

const AGREEMENT_KEY_LIST = Object.values(AGREEMENT_KEYS) as AgreementKey[];

function isTrackedAgreementKey(k: string): k is AgreementKey {
  return AGREEMENT_KEY_LIST.includes(k as AgreementKey);
}

/** Legacy or external writes keyed as “privacy” are treated as confidentiality for this user. */
const AGREEMENT_KEY_AGGREGATION_ALIASES: Record<string, AgreementKey> = {
  privacy: AGREEMENT_KEYS.confidentiality,
};

function canonicalAgreementKeyForRow(
  row: Pick<UserAgreementAcceptanceRow, "agreement_key">
): AgreementKey | null {
  const k = row.agreement_key;
  if (isTrackedAgreementKey(k)) return k as AgreementKey;
  const alias = AGREEMENT_KEY_AGGREGATION_ALIASES[k];
  return alias ?? null;
}

function versionMatchesForCanonical(
  canonical: AgreementKey,
  row: Pick<UserAgreementAcceptanceRow, "agreement_key" | "agreement_version">
): boolean {
  const v = row.agreement_version;
  if (v === AGREEMENT_VERSIONS[canonical]) return true;
  if (
    canonical === AGREEMENT_KEYS.confidentiality &&
    row.agreement_key === "privacy" &&
    v === "1.0"
  ) {
    return true;
  }
  return false;
}

/**
 * Agreement counts as “accepted” for compliance/onboarding only when:
 * - `revoked_at` is null (column absent in legacy DB would break SELECT; migrations add it)
 * - `agreement_version` matches the current `AGREEMENT_VERSIONS[canonical]` (or legacy `privacy`+1.0 → confidentiality)
 */
export function rowIsActiveCurrentAcceptance(
  row: Pick<UserAgreementAcceptanceRow, "agreement_key" | "agreement_version" | "revoked_at">
): boolean {
  const canonical = canonicalAgreementKeyForRow(row);
  if (!canonical) return false;
  if (row.revoked_at) return false;
  return versionMatchesForCanonical(canonical, row);
}

/**
 * Single pass: active keys + latest `accepted_at` per key (same semantics as previous status route loops).
 */
export function aggregateActiveAgreements(
  rows: Pick<UserAgreementAcceptanceRow, "agreement_key" | "agreement_version" | "accepted_at" | "revoked_at">[]
): { activeKeys: Set<AgreementKey>; agreementAcceptedAt: Partial<Record<AgreementKey, string>> } {
  const activeKeys = new Set<AgreementKey>();
  const agreementAcceptedAt: Partial<Record<AgreementKey, string>> = {};

  for (const row of rows) {
    if (!rowIsActiveCurrentAcceptance(row)) continue;
    const k = canonicalAgreementKeyForRow(row)!;
    activeKeys.add(k);
    if (row.accepted_at) agreementAcceptedAt[k] = row.accepted_at;
  }

  return { activeKeys, agreementAcceptedAt };
}
