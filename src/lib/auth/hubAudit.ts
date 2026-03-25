import type { SupabaseClient } from "@supabase/supabase-js";
import { insertAuditLog } from "@/lib/audit/insert";
import type { HubPipelinePhase } from "@/lib/auth/hubPipeline";

/**
 * Audit trail for hub pipeline transitions (non-blocking on failure).
 * Call from API routes when hub_pipeline_phase or hub_access_granted_at changes.
 */
export async function logHubPipelineTransition(
  supabase: SupabaseClient,
  opts: {
    actorUserId: string | null;
    actorEmail?: string | null;
    actorRole?: string | null;
    targetUserId: string;
    fromPhase: HubPipelinePhase | null;
    toPhase: HubPipelinePhase;
    message?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await insertAuditLog(supabase, {
      category: "system",
      action: "HUB_PIPELINE_TRANSITION",
      message:
        opts.message ??
        (opts.fromPhase != null
          ? `hub_pipeline: ${opts.fromPhase} → ${opts.toPhase}`
          : `hub_pipeline → ${opts.toPhase}`),
      actorUserId: opts.actorUserId,
      actorEmail: opts.actorEmail ?? null,
      actorRole: opts.actorRole ?? null,
      targetEntity: "app_user",
      targetId: opts.targetUserId,
      metadata: {
        from_phase: opts.fromPhase,
        to_phase: opts.toPhase,
        ...(opts.metadata ?? {}),
      },
    });
  } catch (e) {
    console.error("[hubAudit] insert failed (non-fatal):", e);
  }
}
