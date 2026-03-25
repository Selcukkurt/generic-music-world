/**
 * Runnable checks for Hub pipeline + redirect helpers (no DB, no browser).
 * Run: npx tsx scripts/verify-onboarding-gate-logic.ts
 */
import assert from "node:assert";

import { getPostHubAuthPath, needsOnboardingShell, needsHubPendingShell } from "@/lib/auth/hubPipeline";
import { getAccessRedirect } from "@/lib/auth/accessRedirect";
import type { CurrentUser } from "@/lib/auth/mapAuthUser";

function baseUser(overrides: Partial<CurrentUser>): CurrentUser {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    email: "user@example.com",
    fullName: "Test User",
    title: "User",
    role: "viewer",
    access_phase: "active",
    lifecycle_status: "active",
    userLifecycleStatus: "active",
    onboarding_completed_at: "2024-06-01T00:00:00.000Z",
    compliance_completed_at: "2024-06-01T00:00:00.000Z",
    hub_pipeline_phase: "active",
    hub_access_granted_at: "2024-06-01T00:00:00.000Z",
    hasHubAccess: true,
    hasFullAppAccess: true,
    activated_at: null,
    ...overrides,
  };
}

function gateUser(u: Pick<CurrentUser, keyof CurrentUser>) {
  return {
    email: u.email,
    lifecycle_status: u.lifecycle_status,
    access_phase: u.access_phase,
    onboarding_completed_at: u.onboarding_completed_at,
    compliance_completed_at: u.compliance_completed_at,
    hub_pipeline_phase: u.hub_pipeline_phase,
    hub_access_granted_at: u.hub_access_granted_at,
  };
}

// 1) profile onboarding, no compliance
{
  const u = baseUser({
    email: "onboarder@example.com",
    access_phase: "onboarding",
    onboarding_completed_at: null,
    compliance_completed_at: null,
    hub_pipeline_phase: "onboarding",
    hub_access_granted_at: null,
    hasHubAccess: false,
    hasFullAppAccess: false,
    userLifecycleStatus: "onboarding",
  });
  assert.strictEqual(needsOnboardingShell(gateUser(u)), true, "case1 needs onboarding shell");
  assert.strictEqual(getPostHubAuthPath({ role: "viewer", u: gateUser(u) }), "/onboarding", "case1 post-login");
  assert.strictEqual(getAccessRedirect("/dashboard", u), "/onboarding", "case1 dashboard guard");
}

// 2) Legacy DB: active + profile done, hub_* columns missing / null — still grant Hub shell access
{
  const u = baseUser({
    email: "legacy@example.com",
    access_phase: "active",
    onboarding_completed_at: "2025-01-01T00:00:00.000Z",
    compliance_completed_at: null,
    hub_pipeline_phase: "invited",
    hub_access_granted_at: null,
    hasHubAccess: true,
    hasFullAppAccess: true,
  });
  assert.strictEqual(needsOnboardingShell(gateUser(u)), false, "case2 legacy has hub via access_phase+onboarding");
  assert.strictEqual(getPostHubAuthPath({ role: "viewer", u: gateUser(u) }), "/dashboard", "case2 post-login");
  assert.strictEqual(getAccessRedirect("/dashboard", u), null, "case2 dashboard allowed");
}

// 3) compliance done, hub granted
{
  const uViewer = baseUser({
    email: "done@example.com",
    access_phase: "active",
    compliance_completed_at: "2025-01-15T12:00:00.000Z",
    hub_pipeline_phase: "active",
    hub_access_granted_at: "2025-01-15T12:00:00.000Z",
    hasHubAccess: true,
    hasFullAppAccess: true,
    role: "viewer",
  });
  assert.strictEqual(needsOnboardingShell(gateUser(uViewer)), false, "case3 viewer exempt from onboarding shell");
  assert.strictEqual(getPostHubAuthPath({ role: "viewer", u: gateUser(uViewer) }), "/dashboard", "case3 viewer post-login");
  assert.strictEqual(getAccessRedirect("/onboarding", uViewer), "/dashboard", "case3 viewer leaves onboarding");

  const uOwner = baseUser({
    email: "owner@example.com",
    compliance_completed_at: "2025-01-15T12:00:00.000Z",
    hub_pipeline_phase: "active",
    hub_access_granted_at: "2025-01-15T12:00:00.000Z",
    hasHubAccess: true,
    hasFullAppAccess: true,
    role: "system_owner",
  });
  assert.strictEqual(getPostHubAuthPath({ role: "system_owner", u: gateUser(uOwner) }), "/system", "case3 system_owner post-login");
  assert.strictEqual(getAccessRedirect("/onboarding", uOwner), "/system", "case3 system_owner leaves onboarding");
}

// 4) Super admin: info@ with null onboarding_completed_at
{
  const raw = {
    email: "info@genericmusic.net",
    access_phase: "active" as const,
    lifecycle_status: "active" as const,
    onboarding_completed_at: null as string | null,
    compliance_completed_at: null as string | null,
    hub_pipeline_phase: "active" as const,
    hub_access_granted_at: null as string | null,
    role: "system_owner" as const,
  };
  assert.strictEqual(needsOnboardingShell(gateUser(raw as CurrentUser)), false, "case4 email bypass");
  assert.strictEqual(getPostHubAuthPath({ role: "system_owner", u: gateUser(raw as CurrentUser) }), "/system", "case4 post-login not onboarding");
}

// 5) awaiting personnel (post-compliance)
{
  const u = baseUser({
    email: "wait@example.com",
    access_phase: "active",
    compliance_completed_at: "2025-01-01T00:00:00.000Z",
    hub_pipeline_phase: "awaiting_personnel",
    hub_access_granted_at: null,
    hasHubAccess: false,
    hasFullAppAccess: false,
  });
  assert.strictEqual(needsHubPendingShell(gateUser(u)), true, "case5 hub pending");
  assert.strictEqual(getPostHubAuthPath({ role: "viewer", u: gateUser(u) }), "/hub-pending", "case5 post-login");
  assert.strictEqual(getAccessRedirect("/dashboard", u), "/hub-pending", "case5 block dashboard");
}

console.log("verify-onboarding-gate-logic: all assertions passed.");
