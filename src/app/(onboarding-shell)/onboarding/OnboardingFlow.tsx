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
  GM_DNA_SECTION_LABELS,
  GM_DNA_SECTION_COUNT,
} from "@/content/compliance/gm-dna-sections";
import Checkbox from "@/components/ui/Checkbox";
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
    gm_dna_sections: Object.fromEntries(
      GM_DNA_ONBOARDING_SECTION_KEYS.map((k) => [k, false])
    ) as ComplianceStatus["gm_dna_sections"],
    gm_dna_sections_completed: 0,
    gm_dna_sections_total: GM_DNA_SECTION_COUNT,
  };
}

/** Count of onboarding subsections marked done — same keys as API `gm_dna_sections` / DB progress. */
function countGmDnaOnboardingDone(c: ComplianceStatus | null): number {
  if (!c) return 0;
  return GM_DNA_ONBOARDING_SECTION_KEYS.filter((k) => Boolean(c.gm_dna_sections?.[k])).length;
}

function isGmDnaOnboardingComplete(c: ComplianceStatus | null): boolean {
  if (!c) return false;
  if (countGmDnaOnboardingDone(c) >= GM_DNA_SECTION_COUNT) return true;
  return (
    typeof c.gm_dna_sections_completed === "number" &&
    c.gm_dna_sections_completed >= GM_DNA_SECTION_COUNT
  );
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
  { id: "gm-dna", label: "GM DNA", hint: "Kurumsal DNA bölümleri" },
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

function stepNavStatusLabel(s: StepNavStatus): string {
  if (s === "done") return "Tamamlandı";
  if (s === "current") return "Devam ediyor";
  if (s === "review") return "İnceleniyor";
  return "Kilitli";
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

  const [confAck, setConfAck] = useState(false);
  const [ipAck, setIpAck] = useState(false);
  const [dnaFinalAck, setDnaFinalAck] = useState(false);
  const finalizeInFlightRef = useRef(false);
  const [finalizeRetryNonce, setFinalizeRetryNonce] = useState(0);

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
    if (data.agreements[AGREEMENT_KEYS.confidentiality]) setConfAck(true);
    if (data.agreements[AGREEMENT_KEYS.intellectual_property]) setIpAck(true);
    if (data.agreements[AGREEMENT_KEYS.gm_dna_final]) setDnaFinalAck(true);
    setComplianceLoading(false);
  }, []);

  const loadCompliance = useCallback(
    async (opts?: { silent?: boolean }) => {
      try {
        const data = await pullComplianceStatus();
        applyCompliancePayload(data);
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Uyumluluk durumu alınamadı";
        if (!opts?.silent) {
          setCompliance(emptyComplianceStatus());
          setComplianceLoading(false);
          setError(`Uyumluluk durumu alınamadı: ${msg}`);
        } else if (process.env.NODE_ENV === "development") {
          console.warn("[OnboardingFlow] compliance refresh failed (silent):", msg);
        }
        return false;
      }
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
    if (step !== 4) {
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

  const postAgreement = async (key: AgreementKey) => {
    const res = await meApiFetch("/api/me/compliance/agreement", {
      method: "POST",
      body: JSON.stringify({ agreement_key: key, agreement_version: AGREEMENT_VERSIONS[key] }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((j as { error?: string }).error ?? "Onay kaydedilemedi");
    }
    await loadCompliance({ silent: true });
  };

  const postGmSection = async (sectionKey: string) => {
    const res = await meApiFetch("/api/me/compliance/gm-dna-section", {
      method: "POST",
      body: JSON.stringify({ section_key: sectionKey }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((j as { error?: string }).error ?? "Bölüm kaydedilemedi");
    }
    await loadCompliance({ silent: true });
  };

  const acceptConfidentiality = async () => {
    if (!confAck) {
      setError("Devam etmek için kutuyu işaretleyin");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await postAgreement(AGREEMENT_KEYS.confidentiality);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi");
    } finally {
      setSubmitting(false);
    }
  };

  const acceptIp = async () => {
    if (!ipAck) {
      setError("Devam etmek için kutuyu işaretleyin");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await postAgreement(AGREEMENT_KEYS.intellectual_property);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi");
    } finally {
      setSubmitting(false);
    }
  };

  const acceptGmDnaFinal = async () => {
    if (!isGmDnaOnboardingComplete(compliance)) {
      setError("Önce tüm GM DNA bölümlerini işaretleyin");
      return;
    }
    if (!dnaFinalAck) {
      setError("Nihai GM DNA onayı için kutuyu işaretleyin");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await postAgreement(AGREEMENT_KEYS.gm_dna_final);
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi");
    } finally {
      setSubmitting(false);
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

  const dnaComplete = isGmDnaOnboardingComplete(compliance);
  const welcomeName = displayLegalName(state);
  const allOnboardingStepsDone = progressStep >= 4;
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
                    title={`${stepNavStatusLabel(st)} — ${meta.label}`}
                    className={`${ONBOARDING_STEP_NAV.topButton} transition enabled:cursor-pointer enabled:hover:bg-[var(--color-surface-hover)]/40 disabled:cursor-not-allowed disabled:opacity-40 ${stepNavChipClass(st)}`}
                    aria-current={displayStep === i ? "step" : undefined}
                  >
                    <span className={ONBOARDING_STEP_NAV.topInner}>
                      <span className={`${ONBOARDING_STEP_NAV.topIcon} opacity-80`} aria-hidden>
                        {stepNavStatusIcon(st)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={ONBOARDING_STEP_NAV.status}>{stepNavStatusLabel(st)}</span>
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
            {progressStep === 4 ? (
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
                Bu süreç, Platforma erişiminizden önceki kurumsal uyum adımlarıdır: <strong className="font-medium text-[var(--color-text-secondary)]">gizlilik</strong>,{" "}
                <strong className="font-medium text-[var(--color-text-secondary)]">fikri mülkiyet</strong> ve{" "}
                <strong className="font-medium text-[var(--color-text-secondary)]">Generic Music DNA</strong> onayları.
                Adımlar tamamlandığında kimlik bilgilerinizi netleştirir; görev tanımı, çalışma modeli ve sözleşme ise
                personel atamanız sonrasında İK ve yönetici akışında yürütülür.
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
        <div
          className={`rounded-2xl border border-[var(--color-border)]/80 bg-[var(--color-surface)]/40 p-6 sm:p-8 ${isReviewMode ? "opacity-[0.97]" : ""}`}
        >
          <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
            <span className="font-medium text-[var(--color-text-secondary)]">Gizlilik taahhüdü.</span> Generic Music
            World ve iş ortaklarına ait gizli bilgileri koruyacağınızı beyan edersiniz.
          </p>
          <div className="mt-6 max-h-48 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/40 p-4 text-left text-sm leading-relaxed text-[var(--color-text-secondary)]">
            <p>
              Bu kurumsal onboarding kapsamında, size erişim verilen ticari sırlar, teknik bilgiler,
              finansal veriler ve üçüncü taraflara ait gizli içerikleri yalnızca yetkili iş amaçlarıyla
              kullanmayı; yetkisiz üçüncü kişilerle paylaşmamayı ve yürürlükteki politikalarımıza uymayı
              kabul edersiniz.
            </p>
          </div>
          <label
            htmlFor="onboarding-conf-ack"
            className="mt-6 flex cursor-pointer items-start gap-3 text-left text-sm text-[var(--color-text)]"
          >
            <Checkbox
              id="onboarding-conf-ack"
              checked={confAck}
              onChange={(e) => setConfAck(e.target.checked)}
              disabled={isReviewMode}
              className="mt-0.5 shrink-0"
            />
            <span>Metni okudum ve gizlilik taahhüdünü kabul ediyorum.</span>
          </label>
          {!isReviewMode ? (
            <div className="mt-10 flex justify-end gap-3">
              <button type="button" onClick={() => void acceptConfidentiality()} disabled={submitting} className={btnPrimary}>
                {submitting ? "…" : "Onayla ve devam et"}
              </button>
            </div>
          ) : null}
        </div>
      )}

      {displayStep === 2 && (
        <div
          className={`rounded-2xl border border-[var(--color-border)]/80 bg-[var(--color-surface)]/40 p-6 sm:p-8 ${isReviewMode ? "opacity-[0.97]" : ""}`}
        >
          <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
            Çalışmalarınızdan doğan haklar ve şirket fikri mülkiyeti hakkında boş zaman
            taahhüdüdür—ayrıntılar görev kapsamınıza göre personel sürecinde netleştirilir.
          </p>
          <div className="mt-6 max-h-48 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/40 p-4 text-left text-sm leading-relaxed text-[var(--color-text-secondary)]">
            <p>
              Kurumsal kaynaklarla üretilen veya bunlara dayanan eserlerin ve geliştirmelerin,
              ilgili mevzuat ve şirket politikaları çerçevesinde Generic Music tarafından kullanımına
              ilişkin çerçeve bu taahhüt ile onaylanır. Görev tanımınıza özgü ayrıntılı hükümler,
              personel atama ve sözleşme aşamasında ele alınacaktır.
            </p>
          </div>
          <label
            htmlFor="onboarding-ip-ack"
            className="mt-6 flex cursor-pointer items-start gap-3 text-left text-sm text-[var(--color-text)]"
          >
            <Checkbox
              id="onboarding-ip-ack"
              checked={ipAck}
              onChange={(e) => setIpAck(e.target.checked)}
              disabled={isReviewMode}
              className="mt-0.5 shrink-0"
            />
            <span>Metni okudum ve fikri mülkiyet çerçevesini kabul ediyorum.</span>
          </label>
          {!isReviewMode ? (
            <div className="mt-10 flex justify-between gap-3">
              <button type="button" onClick={() => setStep(1)} className={btnGhost}>
                Geri
              </button>
              <button type="button" onClick={() => void acceptIp()} disabled={submitting} className={btnPrimary}>
                {submitting ? "…" : "Onayla ve devam et"}
              </button>
            </div>
          ) : null}
        </div>
      )}

      {displayStep === 3 && (
        <div
          className={`rounded-2xl border border-[var(--color-border)]/80 bg-[var(--color-surface)]/40 p-6 sm:p-8 ${isReviewMode ? "opacity-[0.97]" : ""}`}
        >
          <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
            Toplam <strong className="font-semibold text-[var(--color-text)]">{GM_DNA_SECTION_COUNT}</strong>{" "}
            alt bölüm vardır (GM DNA okuyucu ile aynı liste). Her satırda &quot;Okudum&quot; ile
            işaretleyin (
            <strong className="font-semibold text-[var(--color-text)]">
              {countGmDnaOnboardingDone(compliance)}
            </strong>{" "}
            / {GM_DNA_SECTION_COUNT}). Ardından aşağıdaki nihai onayı işaretleyin.
          </p>
          {/*
            Avoid a short max-height scroll trap: only ~4 rows fit in max-h-56, so users completed
            visible rows and thought they were done while the counter showed e.g. 4/14.
            Let the page scroll so all subsections are discoverable.
          */}
          <div className="mt-4 min-h-[22rem] rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/40 p-3">
            {complianceLoading ? (
              <ul className="animate-pulse space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <li
                    key={`dna-skel-${i}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)]/40 px-3 py-3"
                  >
                    <div className="h-4 min-w-0 flex-1 rounded bg-[var(--color-surface2)]" />
                    <div className="h-7 w-16 shrink-0 rounded-lg bg-[var(--color-surface2)]" />
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="space-y-2">
                {GM_DNA_ONBOARDING_SECTION_KEYS.map((key) => {
                  const done = compliance?.gm_dna_sections?.[key] ?? false;
                  return (
                    <li
                      key={key}
                      className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)]/60 px-3 py-2 text-sm"
                    >
                      <span className={`text-left ${done ? "text-[var(--color-text-muted)] line-through" : ""}`}>
                        {GM_DNA_SECTION_LABELS[key]}
                      </span>
                      <button
                        type="button"
                        disabled={done || submitting || isReviewMode}
                        onClick={() => {
                          setError(null);
                          setSubmitting(true);
                          void postGmSection(key)
                            .catch((e) => setError(e instanceof Error ? e.message : "Kaydedilemedi"))
                            .finally(() => setSubmitting(false));
                        }}
                        className="shrink-0 rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)] transition hover:bg-[var(--color-surface-hover)] disabled:opacity-40"
                      >
                        {done ? "Tamam" : "Okudum"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {/*
            Do not pass disabled={!dnaComplete} on the checkbox: a disabled input ignores label/box
            clicks in browsers — if dnaComplete is wrong, onboarding is permanently blocked.
            Gate submission on the CTA instead; acceptGmDnaFinal still validates sections + ack.
          */}
          <label
            htmlFor="onboarding-gm-dna-final-ack"
            className="mt-6 flex cursor-pointer items-start gap-3 text-left text-sm text-[var(--color-text)]"
          >
            <Checkbox
              id="onboarding-gm-dna-final-ack"
              checked={dnaFinalAck}
              onChange={(e) => setDnaFinalAck(e.target.checked)}
              disabled={isReviewMode}
              className="mt-0.5 shrink-0"
            />
            <span>
              Tüm GM DNA bölümlerini okuduğumu ve kurumsal çerçeveyi onayladığımı beyan ederim.
              {!dnaComplete ? (
                <span className="mt-1 block text-xs font-normal text-[var(--color-text-muted)]">
                  Önce yukarıdaki tüm bölümleri &quot;Okudum&quot; ile tamamlayın; ardından bu kutuyu
                  işaretleyip devam edin.
                </span>
              ) : null}
            </span>
          </label>
          {!isReviewMode ? (
            <div className="mt-10 flex justify-between gap-3">
              <button type="button" onClick={() => setStep(2)} className={btnGhost}>
                Geri
              </button>
              <button
                type="button"
                onClick={() => void acceptGmDnaFinal()}
                disabled={submitting || !dnaFinalAck || !dnaComplete}
                className={btnPrimary}
              >
                {submitting ? "…" : "Nihai onay ve devam"}
              </button>
            </div>
          ) : null}
        </div>
      )}

      {displayStep === 4 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--brand-yellow)]/25 bg-[var(--brand-yellow)]/[0.06] px-4 py-4 text-center sm:px-6 sm:text-left">
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">
              <span aria-hidden>🎉</span> Kurumsal uyum adımlarınız tamamlandı.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
              Gizlilik, fikri mülkiyet ve Generic Music DNA uyumluluğunuz kaydedildi. Kimlik bilgileriniz hesap
              oluşturma aşamasındaki kayıtlarınızla eşleştirilir; ek alan doldurmanız gerekmez.
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
      )}
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
                    title={`${stepNavStatusLabel(st)} — ${meta.label}`}
                    className={`${ONBOARDING_STEP_NAV.asideButton} transition enabled:cursor-pointer enabled:hover:bg-[var(--color-surface-hover)]/40 disabled:cursor-not-allowed disabled:opacity-40 ${stepNavChipClass(st)}`}
                    aria-current={displayStep === i ? "step" : undefined}
                  >
                    <span className={ONBOARDING_STEP_NAV.asideInner}>
                      <span className={`${ONBOARDING_STEP_NAV.asideIcon} opacity-80`} aria-hidden>
                        {stepNavStatusIcon(st)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={ONBOARDING_STEP_NAV.status}>{stepNavStatusLabel(st)}</span>
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
        {progressStep === 4 ? <OnboardingInfoHints /> : null}
      </aside>
    </div>
  );
}
