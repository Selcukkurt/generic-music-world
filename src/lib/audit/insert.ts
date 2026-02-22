/**
 * Insert audit log entry into Supabase audit_logs.
 * Used by API routes (settings, etc.).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { LogSeverity, LogCategory, LogStatus } from "./types";

export type InsertAuditLogPayload = {
  severity?: LogSeverity;
  category?: LogCategory;
  action: string;
  message?: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  targetEntity?: string | null;
  targetId?: string | null;
  status?: LogStatus;
  metadata?: Record<string, unknown> | null;
  requestIp?: string | null;
  requestUserAgent?: string | null;
};

export async function insertAuditLog(
  supabase: SupabaseClient,
  payload: InsertAuditLogPayload
): Promise<void> {
  await supabase.from("audit_logs").insert({
    severity: payload.severity ?? "info",
    category: payload.category ?? "system",
    action: payload.action,
    message: payload.message ?? null,
    actor_user_id: payload.actorUserId ?? null,
    actor_email: payload.actorEmail ?? null,
    actor_role: payload.actorRole ?? null,
    target_type: payload.targetEntity ?? null,
    target_id: payload.targetId ?? null,
    status: payload.status ?? "success",
    meta: payload.metadata ?? null,
    ip: payload.requestIp ?? null,
    user_agent: payload.requestUserAgent ?? null,
  });
}
