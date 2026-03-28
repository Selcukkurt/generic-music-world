import { AGREEMENT_KEYS, type AgreementKey } from "@/lib/compliance/constants";
import {
  GM_DNA_ONBOARDING_SECTION_KEYS,
  GM_DNA_SECTION_COUNT,
} from "@/content/compliance/gm-dna-sections";
import { isOnboardingComplete } from "@/lib/auth/onboardingStatus";

/** Snapshot shape from GET /api/me/compliance/status (subset used for routing). */
export type WizardComplianceSnapshot = {
  agreements: Record<AgreementKey, boolean>;
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

function countGmDnaOnboardingDone(c: WizardComplianceSnapshot): number {
  return GM_DNA_ONBOARDING_SECTION_KEYS.filter((k) => Boolean(c.gm_dna_sections?.[k])).length;
}

function isGmDnaOnboardingComplete(c: WizardComplianceSnapshot): boolean {
  if (countGmDnaOnboardingDone(c) >= GM_DNA_SECTION_COUNT) return true;
  return (
    typeof c.gm_dna_sections_completed === "number" &&
    c.gm_dna_sections_completed >= GM_DNA_SECTION_COUNT
  );
}

/**
 * Single source of truth for wizard position: `app_users` access/completion fields +
 * `user_agreement_acceptances` + `user_gm_dna_section_progress` (via compliance snapshot).
 *
 * Step indices match `ONBOARDING_STEPS` in OnboardingFlow:
 * 0 welcome, 1 confidentiality, 2 IP, 3 GM DNA, 4 completion / finalize-wait.
 */
export function derivePersistedOnboardingStep(
  state: OnboardingProgressProfile,
  compliance: WizardComplianceSnapshot
): number {
  if (isOnboardingComplete(state)) return 4;

  const conf = compliance.agreements[AGREEMENT_KEYS.confidentiality];
  const ip = compliance.agreements[AGREEMENT_KEYS.intellectual_property];
  const dnaFinal = compliance.agreements[AGREEMENT_KEYS.gm_dna_final];

  if (dnaFinal) return 4;

  if (!ip) {
    if (!conf) {
      if (state.access_phase === "invited") return 0;
      return 1;
    }
    return 2;
  }

  if (!isGmDnaOnboardingComplete(compliance)) return 3;

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
  if (isOnboardingComplete(state)) return 4;
  if (state.compliance_completed_at) return 4;
  if (state.access_phase === "invited") return 0;
  return 1;
}
