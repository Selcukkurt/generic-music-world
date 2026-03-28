import type { User } from "@supabase/supabase-js";
import type { Role } from "@/lib/rbac/types";
import { resolveCanLogin } from "@/lib/rbac/canLoginPolicy";
import { normalizeAccessPhase, type UserAccessPhase } from "@/lib/auth/accessPhase";
import type { AppLifecycle } from "@/lib/auth/accessPhase";
import {
  deriveUserLifecycleStatus,
  type UserLifecycleStatus,
} from "@/lib/auth/userLifecycleStatus";
import {
  hasHubShellAccess,
  normalizeHubPipelinePhase,
  type HubPipelinePhase,
} from "@/lib/auth/hubPipeline";

export type AppUserLoginRow = {
  can_login?: boolean | null;
  is_active?: boolean | null;
  /** Canonical RBAC (app_users). */
  role_level?: number | null;
  role?: string | null;
  lifecycle_status?: AppLifecycle | null;
  access_phase?: UserAccessPhase | null;
  onboarding_completed_at?: string | null;
  onboarding_status?: string | null;
  activated_at?: string | null;
  compliance_completed_at?: string | null;
  hub_pipeline_phase?: HubPipelinePhase | null;
  hub_access_granted_at?: string | null;
};

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  title: string;
  role: Role;
  role_level?: number | null;
  can_login?: boolean | null;
  access_phase: UserAccessPhase;
  lifecycle_status: AppLifecycle;
  onboarding_completed_at: string | null;
  onboarding_status: string | null;
  compliance_completed_at: string | null;
  hub_pipeline_phase: HubPipelinePhase;
  hub_access_granted_at: string | null;
  /** Full Hub / main app shell (dashboard) access. */
  hasHubAccess: boolean;
  /** Unified product lifecycle (invited | onboarding | awaiting_activation | active | archived). */
  userLifecycleStatus: UserLifecycleStatus;
  /** @deprecated Use hasHubAccess — kept for gradual migration. */
  hasFullAppAccess: boolean;
  activated_at: string | null;
};

function parseRole(value: unknown): Role | null {
  if (typeof value !== "string") return null;
  const lower = value.toLowerCase();
  if (lower === "system_owner" || lower === "system owner" || lower === "super_admin") return "system_owner";
  if (lower === "ceo" || lower === "owner") return "ceo";
  if (lower === "coo") return "coo";
  if (lower === "admin") return "admin";
  if (lower === "lead" || lower === "director") return "lead";
  if (lower === "staff" || lower === "manager") return "staff";
  if (lower === "viewer") return "viewer";
  return null;
}

/** Fallback when app_users.role is missing (dev/legacy). */
function resolveRoleFallback(email: string, metadata?: Record<string, unknown>): Role {
  const metaRole = metadata?.role as string | undefined;
  const parsed = parseRole(metaRole);
  if (parsed) return parsed;

  if (email === "info@genericmusic.net") return "system_owner";
  if (email === "selcuk@genericmusic.net") return "ceo";

  return "viewer";
}

function hubGateFrom(
  email: string,
  lifecycle: AppLifecycle,
  accessPhase: UserAccessPhase,
  onboarding: string | null,
  onboardingStatus: string | null,
  compliance: string | null,
  hubPhase: HubPipelinePhase,
  hubGrant: string | null
) {
  return {
    email,
    lifecycle_status: lifecycle,
    access_phase: accessPhase,
    onboarding_completed_at: onboarding,
    onboarding_status: onboardingStatus,
    compliance_completed_at: compliance,
    hub_pipeline_phase: hubPhase,
    hub_access_granted_at: hubGrant,
  };
}

/** Maps Supabase User + app_users row to CurrentUser. RBAC comes only from app_users. Pure function, server-safe. */
export function mapAuthUserToCurrentUser(
  user: User,
  appUser?: AppUserLoginRow | null
): CurrentUser {
  const email = user.email ?? "";
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const roleFromApp = appUser?.role;
  const role =
    parseRole(roleFromApp) ?? resolveRoleFallback(email, metadata);

  const lifecycleStatus: AppLifecycle = appUser?.lifecycle_status ?? "active";

  if (email === "info@genericmusic.net") {
    const compliance =
      appUser?.compliance_completed_at ?? "1970-01-01T00:00:00.000Z";
    const hubPhase =
      normalizeHubPipelinePhase(appUser?.hub_pipeline_phase ?? "active");
    const hubGrant =
      appUser?.hub_access_granted_at ?? "1970-01-01T00:00:00.000Z";
    const gate = hubGateFrom(
      email,
      lifecycleStatus,
      "active",
      appUser?.onboarding_completed_at ?? "1970-01-01T00:00:00.000Z",
      appUser?.onboarding_status ?? "completed",
      compliance,
      hubPhase,
      hubGrant
    );
    const hasHub = hasHubShellAccess(gate);
    return {
      id: user.id,
      email,
      fullName: "GMW Super Admin",
      title: "Super Administrator",
      role,
      role_level: appUser?.role_level ?? null,
      can_login: true,
      access_phase: "active" as const,
      lifecycle_status: lifecycleStatus,
      onboarding_completed_at:
        appUser?.onboarding_completed_at ?? "1970-01-01T00:00:00.000Z",
      onboarding_status: appUser?.onboarding_status ?? "completed",
      compliance_completed_at: compliance,
      hub_pipeline_phase: hubPhase,
      hub_access_granted_at: hubGrant,
      hasHubAccess: hasHub,
      userLifecycleStatus: "active",
      hasFullAppAccess: hasHub,
      activated_at: appUser?.activated_at ?? null,
    };
  }

  if (!appUser) {
    const accessPhase: UserAccessPhase = "invited";
    const fullName =
      (metadata?.full_name as string) ??
      (metadata?.name as string) ??
      email.split("@")[0] ??
      "Kullanıcı";
    const title =
      (metadata?.title as string) ??
      (metadata?.role as string) ??
      "Kullanıcı";
    const userLifecycleStatus = deriveUserLifecycleStatus(accessPhase, lifecycleStatus);
    const gate = hubGateFrom(
      email,
      lifecycleStatus,
      accessPhase,
      null,
      null,
      null,
      "invited",
      null
    );
    const hasHub = hasHubShellAccess(gate);
    return {
      id: user.id,
      email,
      fullName,
      title,
      role,
      role_level: null,
      can_login: true,
      access_phase: accessPhase,
      lifecycle_status: lifecycleStatus,
      onboarding_completed_at: null,
      onboarding_status: null,
      compliance_completed_at: null,
      hub_pipeline_phase: "invited",
      hub_access_granted_at: null,
      hasHubAccess: hasHub,
      userLifecycleStatus,
      hasFullAppAccess: hasHub,
      activated_at: null,
    };
  }

  const accessPhase: UserAccessPhase = normalizeAccessPhase(appUser.access_phase);
  const hubPhase = normalizeHubPipelinePhase(appUser.hub_pipeline_phase);
  const compliance = appUser.compliance_completed_at ?? null;
  const hubGrant = appUser.hub_access_granted_at ?? null;

  const fullName =
    (metadata?.full_name as string) ??
    (metadata?.name as string) ??
    email.split("@")[0] ??
    "Kullanıcı";
  const title =
    (metadata?.title as string) ??
    (metadata?.role as string) ??
    "Kullanıcı";

  const userLifecycleStatus = deriveUserLifecycleStatus(accessPhase, lifecycleStatus);
  const gate = hubGateFrom(
    email,
    lifecycleStatus,
    accessPhase,
    appUser.onboarding_completed_at ?? null,
    appUser.onboarding_status ?? null,
    compliance,
    hubPhase,
    hubGrant
  );
  const hasHub = hasHubShellAccess(gate);

  return {
    id: user.id,
    email,
    fullName,
    title,
    role,
    role_level: appUser.role_level ?? null,
    can_login: resolveCanLogin({
      can_login: appUser.can_login,
      is_active: appUser.is_active,
      role_level: appUser.role_level ?? null,
    }),
    access_phase: accessPhase,
    lifecycle_status: lifecycleStatus,
    onboarding_completed_at: appUser.onboarding_completed_at ?? null,
    onboarding_status: appUser.onboarding_status ?? null,
    compliance_completed_at: compliance,
    hub_pipeline_phase: hubPhase,
    hub_access_granted_at: hubGrant,
    hasHubAccess: hasHub,
    userLifecycleStatus,
    hasFullAppAccess: hasHub,
    activated_at: appUser.activated_at ?? null,
  };
}

export type { UserLifecycleStatus } from "@/lib/auth/userLifecycleStatus";
export { isOnboardingComplete } from "@/lib/auth/onboardingStatus";
