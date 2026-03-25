import { createServerClient } from "@/lib/supabase/server";
import { isMissingColumnError, isPostgrestSchemaError } from "@/lib/supabase/missingColumn";

export type TryActivateResult = { activated: boolean; reason?: string };

/**
 * Promotes user to access_phase = active when onboarding is done, personnel is linked, and at least one role is assigned.
 * Uses service role — call only from trusted server routes.
 */
export async function tryActivateUserServer(userId: string): Promise<TryActivateResult> {
  let supabase;
  try {
    supabase = createServerClient();
  } catch {
    return { activated: false, reason: "server_misconfigured" };
  }

  type AuRow = {
    access_phase: string | null;
    onboarding_completed_at: string | null;
    lifecycle_status: string | null;
  };

  let au: AuRow | null = null;

  const full = await supabase
    .from("app_users")
    .select("access_phase, onboarding_completed_at, lifecycle_status")
    .eq("id", userId)
    .maybeSingle();

  if (!full.error && full.data) {
    au = full.data as AuRow;
  } else if (full.error) {
    if (isMissingColumnError(full.error.message, "access_phase")) {
      return { activated: false, reason: "schema_lag" };
    }
    if (
      isMissingColumnError(full.error.message, "onboarding_completed_at") ||
      isPostgrestSchemaError(full.error.message)
    ) {
      const core = await supabase
        .from("app_users")
        .select("access_phase, lifecycle_status")
        .eq("id", userId)
        .maybeSingle();
      if (core.error || !core.data) {
        return { activated: false, reason: "read_failed" };
      }
      const c = core.data as Pick<AuRow, "access_phase" | "lifecycle_status">;
      au = {
        access_phase: c.access_phase,
        lifecycle_status: c.lifecycle_status,
        onboarding_completed_at: null,
      };
    } else {
      return { activated: false, reason: "read_failed" };
    }
  }

  if (!au) return { activated: false, reason: "no_user" };

  const life = au.lifecycle_status as string | null | undefined;
  if (life === "archived") return { activated: false, reason: "archived" };

  if (!au.onboarding_completed_at) return { activated: false, reason: "onboarding_incomplete" };

  if (au.access_phase === "active") return { activated: true };

  const { count, error: roleErr } = await supabase
    .from("user_roles")
    .select("role_id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (roleErr) return { activated: false, reason: "roles_read_failed" };
  if (!count || count < 1) return { activated: false, reason: "no_role" };

  const { data: pers, error: pErr } = await supabase
    .from("personnel")
    .select("id")
    .eq("profile_id", userId)
    .limit(1);

  if (pErr) return { activated: false, reason: "personnel_read_failed" };
  if (!pers?.length) return { activated: false, reason: "no_personnel" };

  const now = new Date().toISOString();
  const { error: upErr } = await supabase
    .from("app_users")
    .update({ access_phase: "active", activated_at: now })
    .eq("id", userId);

  if (upErr) {
    if (isMissingColumnError(upErr.message, "access_phase")) {
      return { activated: false, reason: "schema_lag" };
    }
    return { activated: false, reason: "update_failed" };
  }

  return { activated: true };
}
