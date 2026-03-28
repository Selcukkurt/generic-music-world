/**
 * Dev-only observability for `/onboarding` first load.
 *
 * Critical path: access gate (auth + app_users) → parallel onboarding state + compliance APIs →
 * merge + persisted step derivation → shell visible (loading false only after both resolve).
 *
 * Call `reset()` when the onboarding route gate runs, then record gate + flow timings.
 * `logSummary()` prints one table in development after compliance is applied.
 *
 * For before/after comparisons: run locally with DevTools open; copy the
 * `[OnboardingLoad] measured summary` line from the console. Typical wins from
 * parallel state+compliance: `api_compliance` overlaps `api_state` (wall time ≈ max, not sum).
 *
 * Archived examples and conclusions: `docs/internal/ONBOARDING_LOAD_BENCHMARKS.md`.
 */

export type OnboardingLoadMeasured = {
  /** supabase.auth.getUser() duration */
  gateAuthMs?: number;
  /** fetchAppUserForAuth (0ms if served from in-hook cache) */
  gateProfileMs?: number;
  gateProfileFromHookCache?: boolean;
  /** GET /api/me/onboarding/state round-trip */
  apiStateMs?: number;
  /** GET /api/me/compliance/status round-trip */
  apiComplianceMs?: number;
  /** Flow bootstrap start → onboarding state received (intermediate milestone) */
  flowCriticalShellMs?: number;
  /** Flow bootstrap start → compliance merged + setLoading(false) (first wizard paint) */
  flowFullReadyMs?: number;
};

let session: OnboardingLoadMeasured | null = null;

export function onboardingLoadMetricsReset(): void {
  session = {};
}

export function onboardingLoadMetricsIsActive(): boolean {
  return session !== null;
}

export function onboardingLoadMetricsSetGate(params: {
  authMs: number;
  profileMs: number;
  profileFromHookCache: boolean;
}): void {
  if (!session) return;
  session.gateAuthMs = params.authMs;
  session.gateProfileMs = params.profileMs;
  session.gateProfileFromHookCache = params.profileFromHookCache;
}

export function onboardingLoadMetricsSetFlowApi(params: {
  apiStateMs: number;
  apiComplianceMs: number;
  flowCriticalShellMs: number;
  flowFullReadyMs: number;
}): void {
  if (!session) return;
  session.apiStateMs = params.apiStateMs;
  session.apiComplianceMs = params.apiComplianceMs;
  session.flowCriticalShellMs = params.flowCriticalShellMs;
  session.flowFullReadyMs = params.flowFullReadyMs;
}

function devMark(name: string) {
  if (process.env.NODE_ENV !== "development" || typeof performance === "undefined") return;
  try {
    performance.mark(name);
  } catch {
    /* ignore */
  }
}

export function onboardingLoadMetricsMarkFullReady(): void {
  devMark("onboarding:full-ready");
}

export function onboardingLoadMetricsLogSummary(): void {
  if (process.env.NODE_ENV !== "development" || !session) return;
  const s = session;
  const row = {
    gate_auth_ms: s.gateAuthMs ?? "—",
    gate_profile_ms: s.gateProfileMs ?? "—",
    gate_hook_cache: s.gateProfileFromHookCache ?? "—",
    api_state_ms: s.apiStateMs ?? "—",
    api_compliance_ms: s.apiComplianceMs ?? "—",
    flow_critical_shell_ms: s.flowCriticalShellMs ?? "—",
    flow_full_ready_ms: s.flowFullReadyMs ?? "—",
  };
  console.info("[OnboardingLoad] measured summary (durations, ms)", row);
  console.info(
    "[OnboardingLoad] interpret: gate_* = access gate; api_* = parallel server round-trips; " +
      "flow_critical_shell = time to welcome shell after gate; flow_full_ready = compliance merged."
  );
}
