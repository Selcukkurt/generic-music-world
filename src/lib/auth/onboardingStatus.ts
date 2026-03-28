/**
 * Product onboarding completion (compliance funnel finalized on app_users).
 * Prefer timestamp; status is a denormalized flag for gates and backfills.
 */
export function isOnboardingComplete(user: {
  onboarding_completed_at?: string | null;
  onboarding_status?: string | null;
}): boolean {
  const at = user.onboarding_completed_at;
  if (at != null && String(at).trim() !== "") return true;
  const s = typeof user.onboarding_status === "string" ? user.onboarding_status.trim().toLowerCase() : "";
  return s === "completed";
}
