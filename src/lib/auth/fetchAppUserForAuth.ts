import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppUserLoginRow } from "@/lib/auth/mapAuthUser";
import { isMissingColumnError } from "@/lib/supabase/missingColumn";

/**
 * Loads RBAC fields from app_users. Retries with minimal columns if extended select fails (schema cache / migration lag).
 */
export async function fetchAppUserForAuth(
  supabase: SupabaseClient,
  userId: string
): Promise<AppUserLoginRow | null> {
  const full = await supabase
    .from("app_users")
    .select("role, role_level, is_active, can_login")
    .eq("id", userId)
    .single();

  if (!full.error && full.data) {
    return full.data as AppUserLoginRow;
  }

  const msg = full.error?.message ?? "";
  const lower = msg.toLowerCase();
  if (lower.includes("0 rows") || lower.includes("multiple rows")) {
    return null;
  }

  if (
    msg &&
    (isMissingColumnError(msg, "role") ||
      isMissingColumnError(msg, "role_level") ||
      isMissingColumnError(msg, "can_login"))
  ) {
    const minimal = await supabase.from("app_users").select("is_active").eq("id", userId).single();
    if (!minimal.error && minimal.data) {
      return minimal.data as AppUserLoginRow;
    }
  }

  return null;
}
