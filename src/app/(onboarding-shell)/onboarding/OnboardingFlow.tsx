"use client";

/**
 * Onboarding load model — see `docs/internal/ONBOARDING_LOAD_BENCHMARKS.md` and architecture § Performance.
 *
 * Bootstrap: await GET /api/me/onboarding/state and GET /api/me/compliance/status before first paint,
 * then derive wizard `step` from profile + agreement/DNA snapshot (`deriveOnboardingStepWithFallbackCompliance`).
 * `reviewStep` is never written to the backend and is cleared on every full load.
 *
 * Short TTL caches (meApiSession bearer ~4s, fetchAppUserForAuth client map ~5s):
 *   Cut duplicate getSession/app_users bursts on first paint; cleared on auth changes (AuthCacheInvalidation)
 *   and signOut so tokens and RBAC identity do not go stale.
 *
 * Phase-2 server dedupe (getApiUser + onboarding state both hitting app_users) was deferred: acceptable
 * for current load; revisit only if metrics justify the auth/API refactor — doc conclusions in benchmarks file.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase/client";
import { meApiFetch } from "@/lib/me/meApiFetch";
import {
  onboardingLoadMetricsLogSummary,
  onboardingLoadMetricsMarkFullReady,
  onboardingLoadMetricsSetFlowApi,
} from "@/lib/me/onboardingLoadMetrics";
import { AGREEMENT_KEYS, AGREEMENT_VERSIONS, type AgreementKey } from "@/lib/compliance/constants";
import {
  GM_DNA_ONBOARDING_SECTION_KEYS,
  GM_DNA_SECTION_COUNT,
} from "@/content/compliance/gm-dna-sections";
import NdaAcceptanceModal, { NETWORK_ERR } from "@/components/onboarding/NdaAcceptanceModal";
import IpAcceptanceModal from "@/components/onboarding/IpAcceptanceModal";
import { useIpAgreementStepRegressionGuards } from "@/lib/onboarding/agreementStepRegressionGuards";
import OnboardingInfoHints from "@/components/onboarding/OnboardingInfoHints";
import { ONBOARDING_STEP_NAV } from "@/components/onboarding/onboardingStepNavStyles";
import { isOnboardingComplete } from "@/lib/auth/onboardingStatus";
import { deriveOnboardingStepWithFallbackCompliance } from "@/lib/me/onboardingWizardProgress";

type OnboardingState = {
  first_name?: string | null;
  last_name?: string | null;
  full_name: string | null;
  email: string | null;
  role: string | null;
  role_level: number | null;
  title: string | null;
  department: string | null;
  access_phase: string | null;
  onboarding_completed_at: string | null;
  onboarding_status: string | null;
  compliance_completed_at: string | null;
  hub_pipeline_phase: string | null;
  hub_access_granted_at: string | null;
};

type ComplianceStatus = {
  agreements: Record<AgreementKey, boolean>;
  agreement_accepted_at?: Partial<Record<AgreementKey, string>>;
  gm_dna_sections: Record<string, boolean>;
  gm_dna_sections_completed: number;
  gm_dna_sections_total: number;
};

function emptyComplianceStatus(): ComplianceStatus {
  return {
    agreements: {
      [AGREEMENT_KEYS.confidentiality]: false,
      [AGREEMENT_KEYS.intellectual_property]: false,
      [AGREEMENT_KEYS.gm_dna_final]: false,
    },
    agreement_accepted_at: {},
    gm_dna_sections: Object.fromEntries(
      GM_DNA_ONBOARDING_SECTION_KEYS.map((k) => [k, false])
    ) as ComplianceStatus["gm_dna_sections"],
    gm_dna_sections_completed: 0,
    gm_dna_sections_total: GM_DNA_SECTION_COUNT,
  };
}

const ONBOARDING_STEPS = [
  {
    id: "welcome",
    label: "Hoş geldiniz",
    hint: "Giriş ve süreç özeti",
  },
  {
    id: "confidentiality",
    label: "Gizlilik",
    hint: "Gizlilik taahhüdü",
  },
  { id: "ip", label: "Fikri mülkiyet", hint: "Fikri mülkiyet çerçevesi" },
  { id: "completion", label: "Tamamlama", hint: "Aktivasyon bekleme" },
] as const;

const LAST_ONBOARDING_STEP_INDEX = ONBOARDING_STEPS.length - 1;

type StepNavStatus = "done" | "current" | "locked" | "review";

/** Progress `step` is the furthest actionable index; `reviewStep` (when &lt; step) is read-only revisit. */
function getStepNavStatus(index: number, progressStep: number, reviewStep: number | null): StepNavStatus {
  if (index > progressStep) return "locked";
  if (reviewStep !== null && index === reviewStep) return "review";
  if (index === progressStep) return "current";
  if (index < progressStep) return "done";
  return "locked";
}

function agreementAcceptedForStepIndex(index: number, c: ComplianceStatus | null): boolean {
  if (!c?.agreements) return false;
  if (index === 1) return Boolean(c.agreements[AGREEMENT_KEYS.confidentiality]);
  if (index === 2) return Boolean(c.agreements[AGREEMENT_KEYS.intellectual_property]);
  return false;
}

/** Strict sequence: each step is done only when all prior steps are done and this step’s requirement is met. */
function isStepIndexCompleted(
  index: number,
  compliance: ComplianceStatus | null,
  state: OnboardingState,
  progressStep: number
): boolean {
  const confOk = agreementAcceptedForStepIndex(1, compliance);
  const ipOk = agreementAcceptedForStepIndex(2, compliance);

  switch (index) {
    case 0:
      return progressStep >= 1;
    case 1:
      return confOk;
    case 2:
      return confOk && ipOk;
    case 3: {
      const welcomeOk = progressStep >= 1;
      return welcomeOk && confOk && ipOk && isOnboardingComplete(state);
    }
    default:
      return false;
  }
}

function getFirstIncompletePipelineStepIndex(
  compliance: ComplianceStatus | null,
  state: OnboardingState,
  progressStep: number
): number | null {
  for (let i = 0; i <= LAST_ONBOARDING_STEP_INDEX; i++) {
    if (!isStepIndexCompleted(i, compliance, state, progressStep)) return i;
  }
  return null;
}

/**
 * Single label for stepper, aside, and agreement cards. Exactly one step may be «İnceleniyor»:
 * the first incomplete step in pipeline order; earlier incomplete steps block later ones (Beklemede).
 */
function getOnboardingStepStatusLabel(
  index: number,
  progressStep: number,
  _reviewStep: number | null,
  compliance: ComplianceStatus | null,
  state: OnboardingState | null
): string {
  if (state === null) return "Beklemede";

  if (isStepIndexCompleted(index, compliance, state, progressStep)) {
    return "Tamamlandı";
  }

  const firstIncomplete = getFirstIncompletePipelineStepIndex(compliance, state, progressStep);
  if (firstIncomplete === null) {
    return "Tamamlandı";
  }

  if (index === firstIncomplete) {
    return index === LAST_ONBOARDING_STEP_INDEX ? "Devam ediyor" : "İnceleniyor";
  }
  return "Beklemede";
}

/** Route / server flags alone must not imply Tamamlama done without compliance funnel. Fails loudly in development. */
function assertOnboardingSequentialIntegrity(
  compliance: ComplianceStatus | null,
  state: OnboardingState,
  progressStep: number
): void {
  if (process.env.NODE_ENV !== "development") return;
  if (!isStepIndexCompleted(3, compliance, state, progressStep)) return;
  for (let i = 0; i < 3; i++) {
    if (!isStepIndexCompleted(i, compliance, state, progressStep)) {
      console.error(
        "[Onboarding] Invalid state: Tamamlama treated as complete while prerequisite step",
        i,
        "is incomplete. Check isStepIndexCompleted / server profile vs compliance."
      );
    }
  }
}

function agreementStepCardBadgeClass(
  index: number,
  progressStep: number,
  reviewStep: number | null,
  compliance: ComplianceStatus | null,
  state: OnboardingState | null
): string {
  const label = getOnboardingStepStatusLabel(index, progressStep, reviewStep, compliance, state);
  if (label === "Tamamlandı") {
    return "border-emerald-500/35 bg-emerald-500/[0.08] text-emerald-200/90";
  }
  if (label === "İnceleniyor" || label === "Devam ediyor") {
    return "border-sky-500/30 bg-sky-500/[0.06] text-sky-100/85";
  }
  return "border-[var(--color-border)] bg-[var(--color-bg)]/40 text-[var(--color-text-muted)]";
}

function stepNavStatusIcon(s: StepNavStatus): string {
  if (s === "done") return "✓";
  if (s === "current") return "⏳";
  if (s === "review") return "📖";
  return "🔒";
}

/** Secondary to page content: lighter borders/backgrounds, no strong shadows */
function stepNavChipClass(s: StepNavStatus): string {
  if (s === "current") {
    return "border-[var(--brand-yellow)]/30 bg-[var(--brand-yellow)]/[0.05]";
  }
  if (s === "review") {
    return "border-sky-500/25 bg-sky-500/[0.04]";
  }
  if (s === "done") {
    return "border-emerald-500/20 bg-emerald-500/[0.03]";
  }
  return "border-[var(--color-border)]/55 bg-[var(--color-surface)]/30";
}

function displayLegalName(s: OnboardingState | null): string {
  if (!s) return "";
  const combined = [s.first_name, s.last_name].filter(Boolean).join(" ").trim();
  if (combined) return combined;
  const fn = s.full_name?.trim();
  if (fn) return fn;
  const em = s.email?.trim();
  if (em) return em.split("@")[0] ?? em;
  return "";
}

function shouldLeaveOnboarding(data: OnboardingState): "/dashboard" | "/hub-pending" | "/activation-pending" | null {
  if (!isOnboardingComplete(data)) return null;
  if (data.hub_access_granted_at) return "/dashboard";
  const hub = data.hub_pipeline_phase ?? "";
  const personnelWait = hub === "awaiting_personnel" || hub === "personnel_setup";

  if (data.access_phase === "awaiting_activation" && data.compliance_completed_at && personnelWait) {
    return "/hub-pending";
  }
  if (data.access_phase === "awaiting_activation") {
    return "/activation-pending";
  }

  if (data.compliance_completed_at && personnelWait) {
    return "/hub-pending";
  }
  if (data.access_phase === "active" && isOnboardingComplete(data)) {
    if (!personnelWait) {
      return "/dashboard";
    }
  }
  return null;
}

export default function OnboardingFlow() {
  const router = useRouter();
  /** Furthest progress in the wizard (gating); initialized from server after load — not from review UI. */
  const [step, setStep] = useState(0);
  /** Index of a completed step being revisited read-only; `null` means UI follows `step`. */
  const [reviewStep, setReviewStep] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<OnboardingState | null>(null);
  const [compliance, setCompliance] = useState<ComplianceStatus | null>(null);
  /** Until first compliance payload is applied (bootstrap or refresh). */
  const [complianceLoading, setComplianceLoading] = useState(true);

  const finalizeInFlightRef = useRef(false);
  const [finalizeRetryNonce, setFinalizeRetryNonce] = useState(0);
  /** NDA modal is user-triggered only — never auto-opened from step/hydration/fetch */
  const [isNdaOpen, setIsNdaOpen] = useState(false);
  const [isIpOpen, setIsIpOpen] = useState(false);
  /** Isolate from global `submitting` (welcome, step-3 finalize) so agreement modals stay usable. */
  const [ndaAgreementSubmitting, setNdaAgreementSubmitting] = useState(false);
  const [ipAgreementSubmitting, setIpAgreementSubmitting] = useState(false);
  const [ndaModalInstance, setNdaModalInstance] = useState(0);
  const [ipModalInstance, setIpModalInstance] = useState(0);
  const [revokeNdaSubmitting, setRevokeNdaSubmitting] = useState(false);

  /**
   * Drop invalid or stale `reviewStep` (e.g. after `setStep` lowers progress, React commits before a
   * separate "clear review" effect would run — `effectiveReviewStep` below also masks that frame).
   */
  useEffect(() => {
    setReviewStep((rs) => {
      if (rs === null) return null;
      const p = Math.min(Math.max(step, 0), LAST_ONBOARDING_STEP_INDEX);
      if (rs < 0 || rs > LAST_ONBOARDING_STEP_INDEX || rs >= p) return null;
      return rs;
    });
  }, [step]);

  const pullComplianceStatus = useCallback(async (): Promise<ComplianceStatus> => {
    const res = await meApiFetch("/api/me/compliance/status");
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error((j as { error?: string }).error ?? `HTTP ${res.status}`);
    }
    return (await res.json()) as ComplianceStatus;
  }, []);

  const applyCompliancePayload = useCallback((data: ComplianceStatus) => {
    setCompliance(data);
    setComplianceLoading(false);
  }, []);

  const markAgreementAcceptedLocally = useCallback((key: AgreementKey) => {
    const nowIso = new Date().toISOString();
    setCompliance((prev) => {
      const base = prev ?? emptyComplianceStatus();
      return {
        ...base,
        agreements: { ...base.agreements, [key]: true },
        agreement_accepted_at: {
          ...base.agreement_accepted_at,
          [key]: base.agreement_accepted_at?.[key] ?? nowIso,
        },
      };
    });
    setComplianceLoading(false);
  }, []);

  const loadCompliance = useCallback(
    async (opts?: { silent?: boolean; attempts?: number }): Promise<ComplianceStatus | null> => {
      const maxAttempts = Math.max(1, opts?.attempts ?? 1);
      let lastErr: unknown;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const data = await pullComplianceStatus();
          applyCompliancePayload(data);
          if (process.env.NODE_ENV === "development") {
            console.log("[OnboardingFlow] compliance/refetch agreements:", { ...data.agreements });
          }
          return data;
        } catch (e) {
          lastErr = e;
          if (attempt + 1 < maxAttempts) {
            await new Promise((r) => setTimeout(r, 350));
          }
        }
      }
      const msg = lastErr instanceof Error ? lastErr.message : "Uyumluluk durumu alınamadı";
      if (!opts?.silent) {
        setCompliance(emptyComplianceStatus());
        setComplianceLoading(false);
        setError(`Uyumluluk durumu alınamadı: ${msg}`);
      } else if (process.env.NODE_ENV === "development") {
        console.warn("[OnboardingFlow] compliance refresh failed (silent):", msg);
      }
      return null;
    },
    [applyCompliancePayload, pullComplianceStatus]
  );

  const loadState = useCallback(async () => {
    setError(null);
    const res = await meApiFetch("/api/me/onboarding/state");
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error((j as { error?: string }).error ?? "Durum yüklenemedi");
    }
    const data = (await res.json()) as OnboardingState;
    setState(data);
    return data;
  }, []);

  const progressStep = Math.min(Math.max(step, 0), LAST_ONBOARDING_STEP_INDEX);
  const effectiveReviewStep =
    reviewStep !== null &&
    reviewStep >= 0 &&
    reviewStep <= LAST_ONBOARDING_STEP_INDEX &&
    reviewStep < progressStep
      ? reviewStep
      : null;
  const displayStep = effectiveReviewStep ?? progressStep;
  const isReviewMode = effectiveReviewStep !== null;

  useEffect(() => {
    if (displayStep !== 1) setIsNdaOpen(false);
    if (displayStep !== 2) setIsIpOpen(false);
  }, [displayStep]);

  const ndaAccepted = agreementAcceptedForStepIndex(1, compliance);
  const ipAccepted = agreementAcceptedForStepIndex(2, compliance);

  useIpAgreementStepRegressionGuards({
    activeCompletable: !loading && state !== null && displayStep === 2 && !isReviewMode,
    modalOpen: isIpOpen,
    alreadyAccepted: ipAccepted,
  });

  useEffect(() => {
    if (loading || state === null) return;
    assertOnboardingSequentialIntegrity(compliance, state, progressStep);
  }, [loading, state, compliance, progressStep]);

  const handleStepNavigate = useCallback(
    (index: number) => {
      const p = Math.min(Math.max(step, 0), LAST_ONBOARDING_STEP_INDEX);
      if (index > p) return;
      if (index === p) {
        setReviewStep(null);
        return;
      }
      setReviewStep(index);
    },
    [step]
  );

  /**
   * Bootstrap: state + compliance both resolve before hiding the loader so `step` matches persisted progress.
   */
  useEffect(() => {
    let cancelled = false;
    const flowStart = performance.now();

    (async () => {
      try {
        setReviewStep(null);
        setComplianceLoading(true);
        const stateP = (async () => {
          const t0 = performance.now();
          const data = await loadState();
          return { data, ms: performance.now() - t0 };
        })();
        const complianceP = (async () => {
          const t0 = performance.now();
          try {
            const c = await pullComplianceStatus();
            return { c, ms: performance.now() - t0 };
          } catch {
            return { c: null as ComplianceStatus | null, ms: performance.now() - t0 };
          }
        })();

        const { data, ms: apiStateMs } = await stateP;
        if (cancelled) return;

        const leave = shouldLeaveOnboarding(data);
        if (leave) {
          router.replace(leave);
          return;
        }

        const criticalShellMs = performance.now() - flowStart;

        const { c: comp, ms: apiComplianceMs } = await complianceP;
        if (cancelled) return;

        const flowFullReadyMs = performance.now() - flowStart;

        if (comp) {
          applyCompliancePayload(comp);
        } else {
          setCompliance(emptyComplianceStatus());
          setComplianceLoading(false);
          setError("Uyumluluk durumu alınamadı; sayfayı yenileyin veya tekrar deneyin.");
        }

        setStep(deriveOnboardingStepWithFallbackCompliance(data, comp));

        onboardingLoadMetricsSetFlowApi({
          apiStateMs,
          apiComplianceMs,
          flowCriticalShellMs: criticalShellMs,
          flowFullReadyMs,
        });
        onboardingLoadMetricsMarkFullReady();
        onboardingLoadMetricsLogSummary();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Yüklenemedi");
          setComplianceLoading(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyCompliancePayload, loadState, pullComplianceStatus, router]);

  /** Final step: persist onboarding completion using existing profile / auth names (no form). */
  useEffect(() => {
    if (step !== 3) {
      finalizeInFlightRef.current = false;
      return;
    }
    if (state && isOnboardingComplete(state)) {
      return;
    }
    if (finalizeInFlightRef.current) return;
    finalizeInFlightRef.current = true;
    let cancelled = false;
    (async () => {
      setSubmitting(true);
      setError(null);
      try {
        const res = await meApiFetch("/api/me/onboarding/complete", {
          method: "POST",
          body: JSON.stringify({}),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          const detail = (j as { error?: string }).error ?? "Kayıt tamamlanamadı";
          console.error("[OnboardingFlow] POST /api/me/onboarding/complete failed:", res.status, detail);
          throw new Error(detail);
        }
        await supabaseBrowser.auth.refreshSession();
        if (!cancelled) await loadState();
        finalizeInFlightRef.current = false;
      } catch (e) {
        finalizeInFlightRef.current = false;
        const message = e instanceof Error ? e.message : "Kayıt tamamlanamadı";
        if (!cancelled) {
          console.error("[OnboardingFlow] finalize onboarding error:", message, e);
          setError(message);
        }
      } finally {
        if (!cancelled) setSubmitting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    step,
    state?.compliance_completed_at,
    state?.onboarding_completed_at,
    state?.onboarding_status,
    finalizeRetryNonce,
    loadState,
  ]);

  const retryLoad = () => {
    setError(null);
    setReviewStep(null);
    setLoading(true);
    setComplianceLoading(true);
    void (async () => {
      try {
        const data = await loadState();
        const leave = shouldLeaveOnboarding(data);
        if (leave) {
          router.replace(leave);
          return;
        }
        const comp = await pullComplianceStatus().catch(() => null);
        if (comp) applyCompliancePayload(comp);
        else {
          setCompliance(emptyComplianceStatus());
          setComplianceLoading(false);
          setError("Uyumluluk durumu alınamadı.");
        }
        setStep(deriveOnboardingStepWithFallbackCompliance(data, comp));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Yüklenemedi");
        setComplianceLoading(false);
      } finally {
        setLoading(false);
      }
    })();
  };

  const goNextFromWelcome = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const startRes = await meApiFetch("/api/me/onboarding/start", { method: "POST" });
      if (!startRes.ok) {
        const j = await startRes.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Başlatılamadı");
      }
      const data = await loadState();
      const comp = await pullComplianceStatus().catch(() => null);
      if (comp) applyCompliancePayload(comp);
      else {
        setCompliance(emptyComplianceStatus());
        setComplianceLoading(false);
      }
      setStep(deriveOnboardingStepWithFallbackCompliance(data, comp));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Başlatılamadı");
    } finally {
      setSubmitting(false);
    }
  };

  const postAgreement = async (key: AgreementKey, opts?: { skipComplianceReload?: boolean }) => {
    let res: Response;
    try {
      res = await meApiFetch("/api/me/compliance/agreement", {
        method: "POST",
        body: JSON.stringify({
          agreement_key: key,
          agreement_version: AGREEMENT_VERSIONS[key],
          locale: typeof navigator !== "undefined" ? navigator.language : null,
          acceptance_source: "onboarding",
        }),
      });
    } catch {
      throw new Error(NETWORK_ERR);
    }
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      throw new Error(j.error ?? "Onay kaydedilemedi");
    }
    markAgreementAcceptedLocally(key);
    if (!opts?.skipComplianceReload) {
      await loadCompliance({ silent: true, attempts: 3 });
    }
  };

  const acceptNda = async () => {
    setError(null);
    setNdaAgreementSubmitting(true);
    try {
      let res: Response;
      try {
        res = await meApiFetch("/api/me/compliance/agreement", {
          method: "POST",
          body: JSON.stringify({
            agreement_key: AGREEMENT_KEYS.confidentiality,
            agreement_version: AGREEMENT_VERSIONS[AGREEMENT_KEYS.confidentiality],
            locale: typeof navigator !== "undefined" ? navigator.language : null,
            acceptance_source: "onboarding",
          }),
        });
      } catch {
        throw new Error(NETWORK_ERR);
      }
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      markAgreementAcceptedLocally(AGREEMENT_KEYS.confidentiality);
    } finally {
      setNdaAgreementSubmitting(false);
    }
  };

  const revokeNda = async () => {
    setError(null);
    setRevokeNdaSubmitting(true);
    try {
      let res: Response;
      try {
        res = await meApiFetch("/api/me/compliance/agreement/revoke", {
          method: "POST",
          body: JSON.stringify({ agreement_key: AGREEMENT_KEYS.confidentiality }),
        });
      } catch {
        throw new Error(NETWORK_ERR);
      }
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const fresh = await pullComplianceStatus();
      applyCompliancePayload(fresh);
      const st = await loadState();
      setStep(deriveOnboardingStepWithFallbackCompliance(st, fresh));
      setReviewStep(null);
    } finally {
      setRevokeNdaSubmitting(false);
    }
  };

  const acceptIp = async () => {
    setError(null);
    setIpAgreementSubmitting(true);
    try {
      await postAgreement(AGREEMENT_KEYS.intellectual_property, { skipComplianceReload: true });
    } finally {
      setIpAgreementSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="ui-glass w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/90 p-8 text-center shadow-[var(--shadow-soft)]">
          <div className="mx-auto h-1 w-12 rounded-full bg-[var(--brand-yellow)]/80" />
          <p className="mt-6 text-sm font-medium text-[var(--color-text)]">Onboarding yükleniyor</p>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            Profil ve kayıtlı uyumluluk adımlarınız alınıyor…
          </p>
        </div>
        <OnboardingInfoHints livePolitely className="mt-5 w-full max-w-sm" />
      </div>
    );
  }

  if (!state) {
    return (
      <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">{error ?? "Profil yüklenemedi."}</p>
        <button
          type="button"
          onClick={() => retryLoad()}
          className="mt-6 rounded-xl border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-surface-hover)]"
        >
          Tekrar dene
        </button>
      </div>
    );
  }

  const welcomeName = displayLegalName(state);
  const allOnboardingStepsDone = isStepIndexCompleted(3, compliance, state, progressStep);
  const firstPipelineIncomplete = getFirstIncompletePipelineStepIndex(compliance, state, progressStep);
  const completionViewOutOfSync =
    displayStep === 3 && firstPipelineIncomplete !== null && firstPipelineIncomplete < 3;
  const pageStepMeta = ONBOARDING_STEPS[displayStep] ?? ONBOARDING_STEPS[0];

  const btnPrimary =
    "rounded-xl bg-[var(--brand-yellow)] px-6 py-2.5 text-sm font-semibold text-[#121212] shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
  const btnGhost =
    "rounded-xl border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-hover)]";

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:flex-row lg:items-start lg:gap-10 lg:px-8 lg:py-8">
      <div className="min-w-0 flex-1">
        <header className="mb-5 border-b border-[var(--color-border)]/40 pb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            Kurumsal onboarding
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-text)] sm:text-3xl">
            {pageStepMeta.label}
          </h1>
          {displayStep === 0 && welcomeName ? (
            <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">{welcomeName}</p>
          ) : null}
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">Generic Music World</p>
        </header>

        <nav aria-label="Onboarding adımları" className="mb-6 opacity-[0.92]">
          <ol className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:items-stretch">
            {ONBOARDING_STEPS.map((meta, i) => {
              const st = getStepNavStatus(i, progressStep, effectiveReviewStep);
              const locked = st === "locked";
              const navProps = locked
                ? { disabled: true as const }
                : { onClick: () => handleStepNavigate(i), type: "button" as const };
              return (
                <li key={meta.id} className={ONBOARDING_STEP_NAV.topListItem}>
                  <button
                    {...navProps}
                    title={`${getOnboardingStepStatusLabel(i, progressStep, effectiveReviewStep, compliance, state)} — ${meta.label}`}
                    className={`${ONBOARDING_STEP_NAV.topButton} transition enabled:cursor-pointer enabled:hover:bg-[var(--color-surface-hover)]/40 disabled:cursor-not-allowed disabled:opacity-40 ${stepNavChipClass(st)}`}
                    aria-current={displayStep === i ? "step" : undefined}
                  >
                    <span className={ONBOARDING_STEP_NAV.topInner}>
                      <span className={`${ONBOARDING_STEP_NAV.topIcon} opacity-80`} aria-hidden>
                        {stepNavStatusIcon(st)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={ONBOARDING_STEP_NAV.status}>
                          {getOnboardingStepStatusLabel(i, progressStep, effectiveReviewStep, compliance, state)}
                        </span>
                        <span className={ONBOARDING_STEP_NAV.title}>{meta.label}</span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="mx-auto w-full max-w-3xl space-y-6">
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-4 py-3 text-sm text-[var(--color-text-secondary)]"
          >
            <p>{error}</p>
            {progressStep === 3 ? (
              <button
                type="button"
                className="mt-3 text-sm font-medium text-[var(--brand-yellow)] underline-offset-4 hover:underline"
                onClick={() => {
                  setError(null);
                  setSubmitting(false);
                  setFinalizeRetryNonce((n) => n + 1);
                }}
              >
                Tekrar dene
              </button>
            ) : null}
          </div>
        ) : null}

        {isReviewMode ? (
          <div
            className="rounded-lg border border-sky-500/30 bg-sky-500/[0.06] px-3 py-2 sm:px-3.5 sm:py-2"
            role="region"
            aria-label="Salt okunur inceleme modu"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <p className="min-w-0 text-xs leading-snug text-[var(--color-text-secondary)]">
                <span className="font-medium text-[var(--color-text)]">Salt okunur.</span> Tamamlanmış bir adımı
                yeniden görüntülüyorsunuz; kayıtlı onaylar değişmez, tekrar onay gerekmez.
              </p>
              <button
                type="button"
                onClick={() => setReviewStep(null)}
                className="shrink-0 self-start rounded-lg border border-sky-500/40 bg-[var(--color-surface)]/90 px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] shadow-sm transition hover:bg-[var(--color-surface-hover)] sm:self-center"
              >
                Aktif adıma dön
              </button>
            </div>
          </div>
        ) : null}

        {displayStep === 0 && (
          <div className="flex justify-center">
            <div className="ui-glass w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 p-8 shadow-[var(--shadow-medium)] backdrop-blur-sm">
              <p className="text-center text-sm leading-relaxed text-[var(--color-text-muted)]">
                Bu süreç, Platforma erişiminizden önceki yasal uyum adımlarıdır:{" "}
                <strong className="font-medium text-[var(--color-text-secondary)]">gizlilik</strong> ve{" "}
                <strong className="font-medium text-[var(--color-text-secondary)]">fikri mülkiyet</strong> taahhütleri.
                Tamamlandığında kimlik bilgileriniz netleşir; görev tanımı, çalışma modeli ve sözleşme personel
                atamanız sonrasında İK ve yönetici akışında yürütülür.
              </p>
              {!isReviewMode ? (
                <button
                  type="button"
                  onClick={() => void goNextFromWelcome()}
                  disabled={submitting}
                  className={`mt-8 w-full ${btnPrimary} py-3.5`}
                >
                  {submitting ? "…" : "Başla"}
                </button>
              ) : (
                <p className="mt-10 text-center text-xs text-[var(--color-text-muted)]">
                  Bu adım tamamlandı. Üstteki &quot;Aktif adıma dön&quot; ile devam edin.
                </p>
              )}
            </div>
          </div>
        )}

      {displayStep === 1 && (
        <div className="rounded-2xl border border-[var(--color-border)]/70 bg-[var(--color-surface)]/50 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-[var(--color-text)]">Gizlilik</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-muted)]">
                Gizlilik taahhüdünü okuyup onaylamanız gerekir. Metin yalnızca açılan pencerede gösterilir.
              </p>
            </div>
            <span
              className={`inline-flex shrink-0 self-start rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${agreementStepCardBadgeClass(1, progressStep, effectiveReviewStep, compliance, state)}`}
            >
              {getOnboardingStepStatusLabel(1, progressStep, effectiveReviewStep, compliance, state)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setNdaModalInstance((n) => n + 1);
              setIsNdaOpen(true);
            }}
            className={`mt-5 w-full rounded-xl border px-4 py-2.5 text-sm font-semibold transition sm:w-auto ${
              ndaAccepted && !isReviewMode
                ? "border-[var(--color-border)] bg-[var(--color-surface-hover)]/50 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                : "border-[var(--brand-yellow)]/40 bg-[var(--brand-yellow)]/15 text-[var(--color-text)] hover:bg-[var(--brand-yellow)]/25"
            }`}
          >
            Sözleşmeyi Aç
          </button>
          {isReviewMode ? (
            <p className="mt-4 text-xs text-[var(--color-text-muted)]">
              Salt okunur inceleme: sözleşmeyi görüntülemek için &quot;Sözleşmeyi Aç&quot; kullanın.
            </p>
          ) : null}
        </div>
      )}

      {isNdaOpen && displayStep === 1 ? (
        <NdaAcceptanceModal
          key={ndaModalInstance}
          readOnly={isReviewMode}
          alreadyAccepted={ndaAccepted}
          acceptedAt={compliance?.agreement_accepted_at?.[AGREEMENT_KEYS.confidentiality] ?? null}
          allowRevoke={!isOnboardingComplete(state)}
          onRevoke={isReviewMode ? undefined : revokeNda}
          revokeSubmitting={revokeNdaSubmitting}
          showBack={isReviewMode || state.access_phase === "invited"}
          onBack={
            isReviewMode
              ? () => setReviewStep(null)
              : state.access_phase === "invited"
                ? () => setStep(0)
                : undefined
          }
          onClose={() => setIsNdaOpen(false)}
          onAccept={acceptNda}
          onAfterAcceptSuccess={() => {
            void (async () => {
              const comp = await loadCompliance({ silent: true, attempts: 3 });
              const data = await loadState().catch(() => null);
              if (data !== null && comp !== null) {
                setStep(deriveOnboardingStepWithFallbackCompliance(data, comp));
              } else {
                setStep(2);
              }
              setReviewStep(null);
              setIsNdaOpen(false);
            })();
          }}
          submitting={ndaAgreementSubmitting}
        />
      ) : null}

      {displayStep === 2 && (
        <div className={`rounded-2xl border border-[var(--color-border)]/70 bg-[var(--color-surface)]/50 p-5 sm:p-6 ${isReviewMode ? "opacity-[0.97]" : ""}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-[var(--color-text)]">Fikri mülkiyet</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-muted)]">
                Taahhüt metnini okuyup onaylamanız gerekir. Tam metin yalnızca açılan pencerede gösterilir.
              </p>
            </div>
            <span
              className={`inline-flex shrink-0 self-start rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${agreementStepCardBadgeClass(2, progressStep, effectiveReviewStep, compliance, state)}`}
            >
              {getOnboardingStepStatusLabel(2, progressStep, effectiveReviewStep, compliance, state)}
            </span>
          </div>
          <button
            type="button"
            data-onboarding-ip-open
            onClick={() => {
              setIpModalInstance((n) => n + 1);
              setIsIpOpen(true);
            }}
            className={`mt-5 w-full rounded-xl border px-4 py-2.5 text-sm font-semibold transition sm:w-auto ${
              ipAccepted && !isReviewMode
                ? "border-[var(--color-border)] bg-[var(--color-surface-hover)]/50 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                : "border-[var(--brand-yellow)]/40 bg-[var(--brand-yellow)]/15 text-[var(--color-text)] hover:bg-[var(--brand-yellow)]/25"
            }`}
          >
            Sözleşmeyi Aç
          </button>
          {!isReviewMode ? (
            <div className="mt-6 flex justify-start">
              <button type="button" onClick={() => setStep(1)} className={btnGhost}>
                Geri
              </button>
            </div>
          ) : (
            <p className="mt-4 text-xs text-[var(--color-text-muted)]">
              Salt okunur inceleme: taahhüdü görüntülemek için &quot;Sözleşmeyi Aç&quot; kullanın.
            </p>
          )}
        </div>
      )}

      {isIpOpen && displayStep === 2 ? (
        <IpAcceptanceModal
          key={ipModalInstance}
          readOnly={isReviewMode}
          alreadyAccepted={ipAccepted}
          acceptedAt={compliance?.agreement_accepted_at?.[AGREEMENT_KEYS.intellectual_property] ?? null}
          showBack
          onBack={() => setIsIpOpen(false)}
          onClose={() => setIsIpOpen(false)}
          onAccept={acceptIp}
          onAfterAcceptSuccess={() => {
            void (async () => {
              const comp = await loadCompliance({ silent: true, attempts: 3 });
              const data = await loadState().catch(() => null);
              if (data !== null && comp !== null) {
                setStep(deriveOnboardingStepWithFallbackCompliance(data, comp));
              } else {
                setStep(3);
              }
              setReviewStep(null);
              setIsIpOpen(false);
            })();
          }}
          submitting={ipAgreementSubmitting}
        />
      ) : null}

      {displayStep === 3 && completionViewOutOfSync ? (
        <div
          className="rounded-2xl border border-amber-500/35 bg-amber-500/[0.07] px-5 py-5 text-sm text-[var(--color-text-secondary)] sm:px-6"
          role="alert"
        >
          <p className="font-medium text-[var(--color-text)]">İlerleme uyumsuzluğu</p>
          <p className="mt-2 leading-relaxed">
            Tamamlama ekranı açık görünüyor; kayıtlı uyumluluk adımları henüz bitmemiş. Önce{" "}
            <strong>{ONBOARDING_STEPS[firstPipelineIncomplete!]?.label ?? "ilgili"}</strong> adımını tamamlayın.
          </p>
          <button
            type="button"
            onClick={() => {
              setReviewStep(null);
              setStep(firstPipelineIncomplete!);
            }}
            className="mt-4 rounded-xl bg-[var(--brand-yellow)] px-5 py-2.5 text-sm font-semibold text-[#121212]"
          >
            Eksik adıma git
          </button>
        </div>
      ) : null}

      {displayStep === 3 && !completionViewOutOfSync ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--brand-yellow)]/25 bg-[var(--brand-yellow)]/[0.06] px-4 py-4 text-center sm:px-6 sm:text-left">
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">
              <span aria-hidden>🎉</span> Kurumsal uyum adımlarınız tamamlandı.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
              Gizlilik ve fikri mülkiyet taahhütleriniz kaydedildi. Kimlik bilgileriniz hesap oluşturma
              aşamasındaki kayıtlarınızla eşleştirilir; ek alan doldurmanız gerekmez.
            </p>
          </div>

          <div className="ui-glass rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/90 p-8 shadow-[var(--shadow-soft)] sm:p-10">
            {submitting ? (
              <p className="text-center text-sm text-[var(--color-text-muted)]">Kaydınız tamamlanıyor…</p>
            ) : null}
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--brand-yellow)]/35 bg-[var(--brand-yellow)]/[0.07] text-[var(--brand-yellow)]">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-center text-base font-medium text-[var(--color-text)]">Aktivasyon bekleniyor</p>
            <p className="mx-auto mt-3 max-w-lg text-center text-sm leading-relaxed text-[var(--color-text-muted)]">
              Kurumsal onboarding adımlarınız tamamlandı. Şu anda{" "}
              <strong className="font-medium text-[var(--color-text-secondary)]">personel atamanız</strong> İK ve
              yönetici ekipleri tarafından yürütülüyor.
            </p>
            <div className="mx-auto mt-6 max-w-lg text-center text-sm leading-relaxed text-[var(--color-text-muted)]">
              <strong className="font-medium text-[var(--color-text-secondary)]">Rol</strong>, erişim kapsamı ve{" "}
              <strong className="font-medium text-[var(--color-text-secondary)]">sözleşme / çalışma düzeni</strong>{" "}
              yöneticiler ve yetkili yöneticiler tarafından sistem üzerinden tamamlandığında tam Hub erişiminiz
              açılacaktır.
            </div>
            <div className="mt-8 rounded-xl border border-[var(--color-border)]/80 bg-[var(--color-bg)]/50 px-4 py-4">
              <p className="text-center text-sm font-medium text-[var(--color-text)]">Personel ataması sürüyor</p>
              <p className="mt-3 text-center text-xs leading-relaxed text-[var(--color-text-muted)]">
                Bu ekran bilgilendirme amaçlıdır. Yönlendirme veya ek işlem gerekmez; süreç tamamlandığında erişiminiz
                otomatik güncellenir.
              </p>
            </div>
          </div>
        </div>
      ) : null}
        </div>
      </div>

      <aside className="flex shrink-0 flex-col gap-4 lg:sticky lg:top-24 lg:w-80 xl:w-96">
        <div className="ui-glass rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 p-5 shadow-[var(--shadow-soft)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            İlerleme
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {allOnboardingStepsDone
              ? "Tüm adımlar tamamlandı. Tamamlanan adımlara tıklayarak içeriği salt okunur inceleyebilirsiniz; personel atamanız tamamlanana kadar bu ekranda bekleyebilirsiniz."
              : "Adımlar sırayla açılır. Tamamlananlara tıklayıp salt okunur göz atabilirsiniz; aktif adım ⏳, sonraki adımlar 🔒."}
          </p>
          <ol className="mt-5 space-y-2">
            {ONBOARDING_STEPS.map((meta, i) => {
              const st = getStepNavStatus(i, progressStep, effectiveReviewStep);
              const locked = st === "locked";
              const navProps = locked
                ? { disabled: true as const }
                : { onClick: () => handleStepNavigate(i), type: "button" as const };
              return (
                <li key={meta.id}>
                  <button
                    {...navProps}
                    title={`${getOnboardingStepStatusLabel(i, progressStep, effectiveReviewStep, compliance, state)} — ${meta.label}`}
                    className={`${ONBOARDING_STEP_NAV.asideButton} transition enabled:cursor-pointer enabled:hover:bg-[var(--color-surface-hover)]/40 disabled:cursor-not-allowed disabled:opacity-40 ${stepNavChipClass(st)}`}
                    aria-current={displayStep === i ? "step" : undefined}
                  >
                    <span className={ONBOARDING_STEP_NAV.asideInner}>
                      <span className={`${ONBOARDING_STEP_NAV.asideIcon} opacity-80`} aria-hidden>
                        {stepNavStatusIcon(st)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={ONBOARDING_STEP_NAV.status}>
                          {getOnboardingStepStatusLabel(i, progressStep, effectiveReviewStep, compliance, state)}
                        </span>
                        <span className={ONBOARDING_STEP_NAV.title}>{meta.label}</span>
                        <span className={ONBOARDING_STEP_NAV.hint}>{meta.hint}</span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
        {progressStep === 3 ? <OnboardingInfoHints /> : null}
      </aside>
    </div>
  );
}
