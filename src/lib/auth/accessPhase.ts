/** Invite / auth funnel (app_users.access_phase). Distinct from hub_pipeline_phase. */
export type UserAccessPhase = "invited" | "onboarding" | "awaiting_activation" | "active";

export type AppLifecycle = "active" | "passive" | "archived";

export function isArchivedLifecycle(lifecycle: string | null | undefined): boolean {
  return lifecycle === "archived";
}

export function pathAllowsOnboardingShell(pathname: string): boolean {
  return ONBOARDING_ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Normalize DB / API values; unknown → active (safe default). */
export function normalizeAccessPhase(value: unknown): UserAccessPhase {
  if (
    value === "invited" ||
    value === "onboarding" ||
    value === "awaiting_activation" ||
    value === "active"
  ) {
    return value;
  }
  return "active";
}

/** Routes invited / onboarding users may access (main app shell is blocked). */
export const ONBOARDING_ALLOWED_PREFIXES = ["/onboarding"] as const;

/** awaiting_activation: waiting for admin activation after onboarding. */
export const AWAITING_ALLOWED_PREFIXES = ["/activation-pending", "/onboarding/status"] as const;

export function pathAllowedForPhase(
  pathname: string,
  phase: UserAccessPhase,
  lifecycle: AppLifecycle | null | undefined
): boolean {
  if (lifecycle === "archived") {
    return pathname.startsWith("/account-archived");
  }
  if (phase === "invited" || phase === "onboarding") {
    return pathAllowsOnboardingShell(pathname);
  }
  if (phase === "awaiting_activation") {
    return AWAITING_ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  }
  return true;
}

export function shouldUseOnboardingShell(accessPhase: UserAccessPhase): boolean {
  return accessPhase === "invited" || accessPhase === "onboarding";
}

export function shouldUseAwaitingShell(accessPhase: UserAccessPhase): boolean {
  return accessPhase === "awaiting_activation";
}
