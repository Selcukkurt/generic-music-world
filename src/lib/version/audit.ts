import type { SupabaseClient } from "@supabase/supabase-js";

export async function logAudit(
  supabase: SupabaseClient,
  payload: {
    actor_user_id?: string | null;
    actor_role?: string | null;
    action: string;
    changed_fields?: Record<string, unknown> | null;
  }
) {
  await supabase.from("audit_log").insert({
    actor_user_id: payload.actor_user_id ?? null,
    actor_role: payload.actor_role ?? null,
    action: payload.action,
    changed_fields: payload.changed_fields ?? null,
  });
}
