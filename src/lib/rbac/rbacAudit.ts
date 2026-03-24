import type { SupabaseClient } from "@supabase/supabase-js";
import { insertAuditLog } from "@/lib/audit/insert";
import type { NextRequest } from "next/server";

type Actor = { id: string; email?: string; role: string };

export async function logRbacUserAction(
  supabase: SupabaseClient,
  request: NextRequest,
  actor: Actor,
  action: string,
  targetUserId: string,
  message?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await insertAuditLog(supabase, {
      category: "roles",
      action,
      message: message ?? undefined,
      actorUserId: actor.id,
      actorEmail: actor.email ?? null,
      actorRole: actor.role,
      targetEntity: "app_user",
      targetId: targetUserId,
      status: "success",
      metadata: metadata ?? null,
      requestIp: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? undefined,
      requestUserAgent: request.headers.get("user-agent") ?? undefined,
    });
  } catch (e) {
    console.error("[rbacAudit] insert failed (non-fatal):", e);
  }
}
