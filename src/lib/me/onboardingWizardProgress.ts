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

  if (conf && ip) return 3;

  if (!conf) {
    if (state.access_phase === "invited") return 0;
    return 1;
  }

  if (!ip) return 2;

  return 3;
}

/**
 * When compliance GET failed we still avoid snapping users to step 0 incorrectly.
 */
export function deriveOnboardingStepWithFallbackCompliance(
  state: OnboardingProgressProfile,
  compliance: WizardComplianceSnapshot | null
): number {
  if (compliance) return derivePersistedOnboardingStep(state, compliance);
  if (isOnboardingComplete(state)) return 3;
  if (state.compliance_completed_at) return 3;
  if (state.access_phase === "invited") return 0;
  return 1;
}
