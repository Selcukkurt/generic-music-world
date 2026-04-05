import { AGREEMENT_KEYS } from "@/lib/compliance/constants";
import { isOnboardingComplete } from "@/lib/auth/onboardingStatus";

/** Snapshot shape from GET /api/me/compliance/status (subset used for routing). GM DNA fields stay for API parity; wizard steps ignore them. */
export type WizardComplianceSnapshot = {
  agreements: Record<string, boolean>;
  gm_dna_sections: Record<string, boolean>;
  gm_dna_sections_completed: number;
  gm_dna_sections_total: number;
};

export type OnboardingProgressProfile = {
  access_phase: string | null;
  onboarding_completed_at?: string | null;
  onboarding_status?: string | null;
  compliance_completed_at?: string | null;
};

/** Pre-funnel until POST /api/me/onboarding/start promotes to `onboarding`. */
export function isPreStartAccessPhase(access_phase: string | null): boolean {
  return access_phase === "invited" || access_phase === "pending";
}

/**
 * Wizard position from `app_users` + agreement snapshot.
 *
 * Step indices (4 steps): 0 welcome, 1 Gizlilik, 2 Fikri mülkiyet, 3 Tamamlama / finalize.
 * GM DNA is out of onboarding; handled elsewhere post-onboarding.
 */
export function derivePersistedOnboardingStep(
  state: OnboardingProgressProfile,
  compliance: WizardComplianceSnapshot
): number {
  if (isOnboardingComplete(state)) return 3;

  const conf = compliance.agreements[AGREEMENT_KEYS.confidentiality];
  const ip = compliance.agreements[AGREEMENT_KEYS.intellectual_property];
  const preStart = isPreStartAccessPhase(state.access_phase);

  // Tamamlama only after access_phase has left invited|pending (POST /onboarding/start).
  if (conf && ip && !preStart) return 3;

  if (!conf) {
    if (preStart) return 0;
    return 1;
  }

  if (!ip) return 2;

  // Both agreements done but still pre-start — stay on welcome until POST /onboarding/start runs.
  return 0;
}

/**
 * When compliance GET failed we still avoid snapping users to step 0 incorrectly.
 */
export function deriveOnboardingStepWithFallbackCompliance(
  state: OnboardingProgressProfile,
  compliance: WizardComplianceSnapshot | null
): number {
  const preStart = isPreStartAccessPhase(state.access_phase);
  if (compliance) return derivePersistedOnboardingStep(state, compliance);
  if (isOnboardingComplete(state)) return 3;
  if (state.compliance_completed_at && !preStart) return 3;
  if (preStart) return 0;
  return 1;
}
