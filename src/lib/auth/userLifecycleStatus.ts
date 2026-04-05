import type { AppLifecycle, UserAccessPhase } from "@/lib/auth/accessPhase";

/**
 * Product-facing lifecycle for gating “full” app access.
 * Derived from `app_users.lifecycle_status` (operational) + `app_users.access_phase` (onboarding funnel).
 *
 * - `archived` wins over everything.
 * - Operational `passive` maps here to `awaiting_activation` (not yet entitled to full app).
 * - Otherwise the access_phase drives invited / onboarding / awaiting_activation / active.
 */
export type UserLifecycleStatus =
  | "invited"
  | "onboarding"
  | "awaiting_activation"
  | "active"
  | "archived";

export function deriveUserLifecycleStatus(
  accessPhase: UserAccessPhase,
  lifecycle: AppLifecycle | null | undefined
): UserLifecycleStatus {
  const life = lifecycle ?? "active";
  if (life === "archived") return "archived";
  if (life === "passive") return "awaiting_activation";

  if (accessPhase === "invited" || accessPhase === "pending") return "invited";
  if (accessPhase === "onboarding") return "onboarding";
  if (accessPhase === "awaiting_activation") return "awaiting_activation";
  return "active";
}

/** Full main-app entitlement (onboarding funnel complete + operational active). */
export function hasFullAppAccessStatus(status: UserLifecycleStatus): boolean {
  return status === "active";
}
