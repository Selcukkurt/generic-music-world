import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppUserLoginRow } from "@/lib/auth/mapAuthUser";
import {
  isMissingColumnError,
  isNoRowOrNotSingleError,
  isPostgrestSchemaError,
} from "@/lib/supabase/missingColumn";

const SELECT_FULL =
  "role, role_level, is_active, can_login, lifecycle_status, access_phase, onboarding_completed_at, onboarding_status, activated_at, compliance_completed_at, hub_pipeline_phase, hub_access_granted_at";
/** Same as SELECT_FULL if onboarding_status is not migrated yet. */
const SELECT_FULL_NO_ONBOARDING_STATUS =
  "role, role_level, is_active, can_login, lifecycle_status, access_phase, onboarding_completed_at, activated_at, compliance_completed_at, hub_pipeline_phase, hub_access_granted_at";
/** When hub columns are missing, still load auth + invite fields. */
const SELECT_PRE_HUB =
  "role, role_level, is_active, can_login, lifecycle_status, access_phase, onboarding_completed_at, activated_at";
const SELECT_LEGACY = "role, role_level, is_active, can_login, lifecycle_status";

/** Dedupes burst reads (access gate + header + onboarding) on first paint. */
const APP_USER_CLIENT_CACHE_TTL_MS = 5000;
const appUserClientCache = new Map<string, { row: AppUserLoginRow | null; at: number }>();

function withHubDefaults(row: Partial<AppUserLoginRow>): AppUserLoginRow {
  return {
    ...row,
    onboarding_completed_at: row.onboarding_completed_at ?? null,
    onboarding_status: row.onboarding_status ?? null,
    activated_at: row.activated_at ?? null,
    compliance_completed_at: row.compliance_completed_at ?? null,
    hub_pipeline_phase: row.hub_pipeline_phase ?? "invited",
    hub_access_granted_at: row.hub_access_granted_at ?? null,
  } as AppUserLoginRow;
}

async function loadAppUserRowFromDb(
  supabase: SupabaseClient,
  userId: string
): Promise<AppUserLoginRow | null> {
  const full = await supabase
    .from("app_users")
    .select(SELECT_FULL)
    .eq("id", userId)
    .single();

  if (!full.error && full.data) {
    return full.data as AppUserLoginRow;
  }

  const msg = full.error?.message ?? "";
  if (isNoRowOrNotSingleError(msg)) {
    return null;
  }

  const retryForSchema =
    isPostgrestSchemaError(msg) ||
    isMissingColumnError(msg, "access_phase") ||
    isMissingColumnError(msg, "lifecycle_status") ||
    isMissingColumnError(msg, "onboarding_completed_at") ||
    isMissingColumnError(msg, "onboarding_status") ||
    isMissingColumnError(msg, "activated_at") ||
    isMissingColumnError(msg, "compliance_completed_at") ||
    isMissingColumnError(msg, "hub_pipeline_phase") ||
    isMissingColumnError(msg, "hub_access_granted_at");

  if (retryForSchema) {
    if (isMissingColumnError(msg, "onboarding_status")) {
      const noStatus = await supabase
        .from("app_users")
        .select(SELECT_FULL_NO_ONBOARDING_STATUS)
        .eq("id", userId)
        .single();
      if (!noStatus.error && noStatus.data) {
        return withHubDefaults(noStatus.data as Partial<AppUserLoginRow>);
      }
    }

    const preHub = await supabase
      .from("app_users")
      .select(SELECT_PRE_HUB)
      .eq("id", userId)
      .single();

    if (!preHub.error && preHub.data) {
      return withHubDefaults(preHub.data as Partial<AppUserLoginRow>);
    }

    const preMsg = preHub.error?.message ?? "";
    if (isNoRowOrNotSingleError(preMsg)) {
      return null;
    }

    const legacy = await supabase
      .from("app_users")
      .select(SELECT_LEGACY)
      .eq("id", userId)
      .single();

    if (!legacy.error && legacy.data) {
      return withHubDefaults({
        ...(legacy.data as AppUserLoginRow),
        access_phase: "invited",
        onboarding_completed_at: null,
        onboarding_status: null,
        compliance_completed_at: null,
        hub_pipeline_phase: "invited",
        hub_access_granted_at: null,
      });
    }

    const legMsg = legacy.error?.message ?? "";
    if (isNoRowOrNotSingleError(legMsg)) {
      return null;
    }
  }

  if (
    msg &&
    (isMissingColumnError(msg, "role") ||
      isMissingColumnError(msg, "role_level") ||
      isMissingColumnError(msg, "can_login"))
  ) {
    const minimal = await supabase.from("app_users").select("is_active").eq("id", userId).single();
    if (!minimal.error && minimal.data) {
      return withHubDefaults({
        ...(minimal.data as AppUserLoginRow),
        access_phase: "invited",
        onboarding_completed_at: null,
        onboarding_status: null,
        compliance_completed_at: null,
        hub_pipeline_phase: "invited",
        hub_access_granted_at: null,
      });
    }
  }

  return null;
}

/**
 * Loads RBAC fields from app_users. Retries with smaller column lists if optional
 * columns are missing (migration not applied / schema drift).
 * Short-lived client cache avoids duplicate queries while the shell and onboarding mount.
 */
export async function fetchAppUserForAuth(
  supabase: SupabaseClient,
  userId: string
): Promise<AppUserLoginRow | null> {
  const now = Date.now();
  const hit = appUserClientCache.get(userId);
  if (hit && now - hit.at < APP_USER_CLIENT_CACHE_TTL_MS) {
    return hit.row;
  }
  const row = await loadAppUserRowFromDb(supabase, userId);
  appUserClientCache.set(userId, { row, at: now });
  return row;
}

/** Invalidate client `app_users` cache (e.g. after auth or role change). Omit userId to clear all. */
export function invalidateAppUserClientCache(userId?: string): void {
  if (userId) {
    appUserClientCache.delete(userId);
  } else {
    appUserClientCache.clear();
  }
}
