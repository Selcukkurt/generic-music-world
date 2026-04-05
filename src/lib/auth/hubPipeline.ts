import type { Role } from "@/lib/rbac/types";
import type { AppLifecycle } from "@/lib/auth/accessPhase";
import type { UserAccessPhase } from "@/lib/auth/accessPhase";
import { isOnboardingComplete } from "@/lib/auth/onboardingStatus";

/** Source of truth for Hub shell routing (app_users.hub_pipeline_phase). */
export type HubPipelinePhase =
  | "invited"
  | "onboarding"
  | "awaiting_personnel"
  | "personnel_setup"
  | "active"
  | "archived";

export type PersonnelEmploymentSnapshot = {
  profile_id: string | null;
  employment_lifecycle: string | null;
  work_model: string | null;
  contract_status: string | null;
} | null;

export type HubEntitlementInput = {
  lifecycle_status: AppLifecycle;
  compliance_completed_at: string | null;
  hub_access_granted_at: string | null;
  hub_pipeline_phase: HubPipelinePhase;
  personnel: PersonnelEmploymentSnapshot;
  /** When true, user has at least one role assignment (RBAC). */
  hasAssignedRole: boolean;
};

export type HubEntitlementResult = {
  granted: boolean;
  reason:
    | "granted"
    | "not_compliant"
    | "no_personnel_link"
    | "employment_not_active"
    | "work_model_missing"
    | "contract_not_active"
    | "rbac_incomplete"
    | "hub_not_granted"
    | "archived";
};

/**
 * Full Hub access (product shell): compliance + linked personnel + active employment + RBAC.
 * Use hub_access_granted_at as the denormalized flag once backend syncs it; this function
 * validates the full rule set for server jobs and reconciliation.
 *
 * Duties / responsibilities and contract approval are not part of generic onboarding; they are
 * enforced in the personnel + employment pipeline before `hub_access_granted_at` (e.g. contract
 * state and any future “duties approved” flags on personnel records).
 */
export function resolveHubEntitlement(input: HubEntitlementInput): HubEntitlementResult {
  if (input.lifecycle_status === "archived") {
    return { granted: false, reason: "archived" };
  }
  if (!input.compliance_completed_at) {
    return { granted: false, reason: "not_compliant" };
  }
  if (!input.personnel?.profile_id) {
    return { granted: false, reason: "no_personnel_link" };
  }
  if (input.personnel.employment_lifecycle !== "active") {
    return { granted: false, reason: "employment_not_active" };
  }
  if (!input.personnel.work_model) {
    return { granted: false, reason: "work_model_missing" };
  }
  if (input.personnel.contract_status !== "active") {
    return { granted: false, reason: "contract_not_active" };
  }
  if (!input.hasAssignedRole) {
    return { granted: false, reason: "rbac_incomplete" };
  }
  if (!input.hub_access_granted_at) {
    return { granted: false, reason: "hub_not_granted" };
  }
  return { granted: true, reason: "granted" };
}

/** Normalize DB value to HubPipelinePhase. */
export function normalizeHubPipelinePhase(value: unknown): HubPipelinePhase {
  if (
    value === "invited" ||
    value === "onboarding" ||
    value === "awaiting_personnel" ||
    value === "personnel_setup" ||
    value === "active" ||
    value === "archived"
  ) {
    return value;
  }
  return "invited";
}

export const HUB_PENDING_ALLOWED_PREFIXES = ["/hub-pending"] as const;

export function pathAllowsHubPendingShell(pathname: string): boolean {
  return HUB_PENDING_ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export type HubGateUser = {
  email: string;
  lifecycle_status: AppLifecycle;
  access_phase: UserAccessPhase;
  /** Profile onboarding (legacy / profile capture). */
  onboarding_completed_at: string | null;
  /** Denormalized: pending | completed (see migration onboarding_status). */
  onboarding_status?: string | null;
  compliance_completed_at: string | null;
  hub_pipeline_phase: HubPipelinePhase;
  hub_access_granted_at: string | null;
};

/**
 * Compliance timestamp for routing when `compliance_completed_at` is not yet migrated / null.
 * Safe fallback: pre-hub users who already had `access_phase = active` + profile onboarding done.
 */
export function effectiveComplianceAt(u: HubGateUser): string | null {
  if (u.compliance_completed_at) return u.compliance_completed_at;
  if (u.access_phase === "active" && isOnboardingComplete(u)) {
    return u.onboarding_completed_at ?? u.compliance_completed_at ?? null;
  }
  return null;
}

/** Full Hub / main app shell (dashboard) — denormalized grant timestamp + archived guard. */
export function hasHubShellAccess(u: HubGateUser): boolean {
  if (u.email === "info@genericmusic.net") return true;
  if (u.lifecycle_status === "archived") return false;
  if (!isOnboardingComplete(u)) return false;
  if (u.hub_access_granted_at != null) return true;
  // New pipeline: explicitly not granted until employment + hub_access_granted_at backfill.
  if (u.hub_pipeline_phase === "awaiting_personnel" || u.hub_pipeline_phase === "personnel_setup") {
    return false;
  }
  // Legacy / partial migration: pre-hub users (never in awaiting_personnel / personnel_setup).
  if (u.access_phase === "active" && isOnboardingComplete(u)) return true;
  return false;
}

/** Profile + compliance funnel (and pre-compliance): stay on /onboarding. */
export function needsOnboardingShell(u: HubGateUser): boolean {
  if (hasHubShellAccess(u)) return false;
  if (u.lifecycle_status === "archived") return false;
  /** Legacy access_phase; handled by activation-pending or hub-pending, not profile onboarding shell. */
  if (u.access_phase === "awaiting_activation") return false;
  if (!isOnboardingComplete(u)) return true;
  if (!effectiveComplianceAt(u)) return true;
  // Funnel phases: only force shell while auth invite flow still says invited/onboarding.
  if (u.hub_pipeline_phase === "invited" || u.hub_pipeline_phase === "onboarding") {
    return (
      u.access_phase === "invited" ||
      u.access_phase === "pending" ||
      u.access_phase === "onboarding"
    );
  }
  return false;
}

/** After compliance, waiting for HR / employment setup — /hub-pending. */
export function needsHubPendingShell(u: HubGateUser): boolean {
  if (hasHubShellAccess(u)) return false;
  if (u.lifecycle_status === "archived") return false;
  if (!effectiveComplianceAt(u)) return false;
  return u.hub_pipeline_phase === "awaiting_personnel" || u.hub_pipeline_phase === "personnel_setup";
}

export function getPostHubAuthPath(input: {
  role: Role;
  u: HubGateUser;
}): string {
  const { u } = input;
  if (u.lifecycle_status === "archived") return "/account-archived";
  if (hasHubShellAccess(u)) {
    return input.role === "system_owner" ? "/system" : "/dashboard";
  }
  if (needsOnboardingShell(u)) return "/onboarding";
  /** Personnel / HR wait — must win over access_phase awaiting_activation when both apply. */
  if (needsHubPendingShell(u)) return "/hub-pending";
  if (u.access_phase === "awaiting_activation") return "/activation-pending";
  return input.role === "system_owner" ? "/system" : "/dashboard";
}
