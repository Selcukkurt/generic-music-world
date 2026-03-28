"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase/client";
import { meApiFetch } from "@/lib/me/meApiFetch";
import { AGREEMENT_KEYS, AGREEMENT_VERSIONS, type AgreementKey } from "@/lib/compliance/constants";
import {
  GM_DNA_ONBOARDING_SECTION_KEYS,
  GM_DNA_SECTION_LABELS,
  GM_DNA_SECTION_COUNT,
} from "@/content/compliance/gm-dna-sections";
import Checkbox from "@/components/ui/Checkbox";
import { isOnboardingComplete } from "@/lib/auth/onboardingStatus";

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

type StepStatus = "done" | "current" | "locked";

function getStepStatus(index: number, currentStep: number, allStepsComplete = false): StepStatus {
  if (allStepsComplete) return "done";
  if (index < currentStep) return "done";
  if (index === currentStep) return "current";
  return "locked";
}

function stepStatusLabel(s: StepStatus): string {
  if (s === "done") return "Tamamlandı";
  if (s === "current") return "Devam ediyor";
  return "Kilitli";
}

function stepStatusIcon(s: StepStatus): string {
  if (s === "done") return "✓";
  if (s === "current") return "⏳";
  return "🔒";
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
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<OnboardingState | null>(null);
  const [compliance, setCompliance] = useState<ComplianceStatus | null>(null);

  const [confAck, setConfAck] = useState(false);
  const [ipAck, setIpAck] = useState(false);
  const [dnaFinalAck, setDnaFinalAck] = useState(false);
  const finalizeInFlightRef = useRef(false);
  const [finalizeRetryNonce, setFinalizeRetryNonce] = useState(0);

  const loadCompliance = useCallback(async (opts?: { silent?: boolean }) => {
    const res = await meApiFetch("/api/me/compliance/status");
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      const msg = (j as { error?: string }).error ?? `HTTP ${res.status}`;
      // Silent refresh runs after successful POSTs — never wipe local compliance or the GM DNA
      // final checkbox stays disabled with no way to recover (interaction bug).
      if (!opts?.silent) {
        setCompliance(emptyComplianceStatus());
        setError(`Uyumluluk durumu alınamadı: ${msg}`);
      } else if (process.env.NODE_ENV === "development") {
        console.warn("[OnboardingFlow] compliance refresh failed (silent):", msg);
      }
      return false;
    }
    const data = (await res.json()) as ComplianceStatus;
    setCompliance(data);
    if (data.agreements[AGREEMENT_KEYS.confidentiality]) setConfAck(true);
    if (data.agreements[AGREEMENT_KEYS.intellectual_property]) setIpAck(true);
    if (data.agreements[AGREEMENT_KEYS.gm_dna_final]) setDnaFinalAck(true);
    return true;
  }, []);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadState();
        if (cancelled) return;
        const leave = shouldLeaveOnboarding(data);
        if (leave) {
          router.replace(leave);
          return;
        }
        await loadCompliance();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Yüklenemedi");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadState, loadCompliance, router]);

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
    setLoading(true);
    void loadState()
      .then((data) => {
        const leave = shouldLeaveOnboarding(data);
        if (leave) {
          router.replace(leave);
          return;
        }
        return loadCompliance();
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Yüklenemedi"))
      .finally(() => setLoading(false));
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
      await loadState();
      setStep(1);
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
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">Profil ve uyumluluk durumu alınıyor…</p>
        </div>
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
  const allOnboardingStepsDone = step >= 4;

  const btnPrimary =
    "rounded-xl bg-[var(--brand-yellow)] px-6 py-2.5 text-sm font-semibold text-[#121212] shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
  const btnGhost =
    "rounded-xl border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-hover)]";

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:flex-row lg:items-start lg:gap-10 lg:px-8 lg:py-8">
      <div className="min-w-0 flex-1">
        <nav aria-label="Onboarding adımları" className="mb-8">
          <ol className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap">
            {ONBOARDING_STEPS.map((meta, i) => {
              const st = getStepStatus(i, step, allOnboardingStepsDone);
              return (
                <li
                  key={meta.id}
                  className={`min-w-[148px] shrink-0 rounded-xl border px-3 py-2.5 transition sm:min-w-0 sm:flex-1 ${
                    st === "current"
                      ? "border-[var(--brand-yellow)]/55 bg-[var(--brand-yellow)]/12 shadow-[0_0_0_1px_rgba(245,197,66,0.15)]"
                      : st === "done"
                        ? "border-emerald-500/35 bg-emerald-500/5"
                        : "border-[var(--color-border)]/80 bg-[var(--color-surface)]/50"
                  }`}
                  aria-current={st === "current" ? "step" : undefined}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base leading-none" aria-hidden>
                      {stepStatusIcon(st)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                        {stepStatusLabel(st)}
                      </p>
                      <p className="truncate text-sm font-semibold text-[var(--color-text)]">{meta.label}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </nav>

        {error ? (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-4 py-3 text-sm text-[var(--color-text-secondary)]"
          >
            <p>{error}</p>
            {step === 4 ? (
              <button
                type="button"
                className="mt-3 text-sm font-medium text-[var(--brand-yellow)] underline-offset-4 hover:underline"
                onClick={() => {
                  setError(null);
                  setFinalizeRetryNonce((n) => n + 1);
                }}
              >
                Tekrar dene
              </button>
            ) : null}
          </div>
        ) : null}

        {step === 0 && (
          <div className="flex justify-center">
            <div className="ui-glass w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 p-8 shadow-[var(--shadow-medium)] backdrop-blur-sm">
              <div className="mx-auto mb-6 h-1.5 w-14 rounded-full bg-[var(--brand-yellow)]" />
              <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-yellow)]">
                Kurumsal onboarding
              </p>
              <h1 className="mt-3 text-center text-2xl font-semibold tracking-tight text-[var(--color-text)]">
                Hoş geldiniz{welcomeName ? `, ${welcomeName}` : ""}
              </h1>
              <p className="mt-5 text-center text-sm leading-relaxed text-[var(--color-text-muted)]">
                Bu süreç, Platforma erişiminizden önceki kurumsal uyum adımlarıdır: <strong className="font-medium text-[var(--color-text-secondary)]">gizlilik</strong>,{" "}
                <strong className="font-medium text-[var(--color-text-secondary)]">fikri mülkiyet</strong> ve{" "}
                <strong className="font-medium text-[var(--color-text-secondary)]">Generic Music DNA</strong> onayları.
                Adımlar tamamlandığında kimlik bilgilerinizi netleştirir; görev tanımı, çalışma modeli ve sözleşme ise
                personel atamanız sonrasında İK ve yönetici akışında yürütülür.
              </p>
              <button
                type="button"
                onClick={() => void goNextFromWelcome()}
                disabled={submitting}
                className={`mt-10 w-full ${btnPrimary} py-3.5`}
              >
                {submitting ? "…" : "Başla"}
              </button>
            </div>
          </div>
        )}

      {step === 1 && (
        <div className="rounded-2xl border border-[var(--color-border)]/80 bg-[var(--color-surface)]/40 p-6 sm:p-8">
          <h1 className="text-xl font-semibold text-[var(--color-text)]">Gizlilik taahhüdü</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Generic Music World ve iş ortaklarına ait gizli bilgileri koruyacağınızı beyan edersiniz.
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
              className="mt-0.5 shrink-0"
            />
            <span>Metni okudum ve gizlilik taahhüdünü kabul ediyorum.</span>
          </label>
          <div className="mt-10 flex justify-between gap-3">
            <button type="button" onClick={() => setStep(0)} className={btnGhost}>
              Geri
            </button>
            <button type="button" onClick={() => void acceptConfidentiality()} disabled={submitting} className={btnPrimary}>
              {submitting ? "…" : "Onayla ve devam et"}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="rounded-2xl border border-[var(--color-border)]/80 bg-[var(--color-surface)]/40 p-6 sm:p-8">
          <h1 className="text-xl font-semibold text-[var(--color-text)]">Fikri mülkiyet</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
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
              className="mt-0.5 shrink-0"
            />
            <span>Metni okudum ve fikri mülkiyet çerçevesini kabul ediyorum.</span>
          </label>
          <div className="mt-10 flex justify-between gap-3">
            <button type="button" onClick={() => setStep(1)} className={btnGhost}>
              Geri
            </button>
            <button type="button" onClick={() => void acceptIp()} disabled={submitting} className={btnPrimary}>
              {submitting ? "…" : "Onayla ve devam et"}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-2xl border border-[var(--color-border)]/80 bg-[var(--color-surface)]/40 p-6 sm:p-8">
          <h1 className="text-xl font-semibold text-[var(--color-text)]">Generic Music DNA</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
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
          <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/40 p-3">
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
                      disabled={done || submitting}
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
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--brand-yellow)]/35 bg-[var(--brand-yellow)]/10 px-4 py-5 text-center sm:px-8 sm:text-left">
            <p className="text-xl font-semibold tracking-tight text-[var(--color-text)] sm:text-2xl">
              <span aria-hidden>🎉</span> Onboarding tamamlandı
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
              Gizlilik, fikri mülkiyet ve Generic Music DNA uyumluluğunuz kaydedildi. Kimlik bilgileriniz hesap
              oluşturma aşamasındaki kayıtlarınızla eşleştirilir; ek alan doldurmanız gerekmez.
            </p>
          </div>

          <div className="ui-glass rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/90 p-8 shadow-[var(--shadow-soft)] sm:p-10">
            {submitting ? (
              <p className="text-center text-sm text-[var(--color-text-muted)]">Kaydınız tamamlanıyor…</p>
            ) : null}
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--brand-yellow)]/40 bg-[var(--brand-yellow)]/10 text-[var(--brand-yellow)]">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-center text-xl font-semibold text-[var(--color-text)]">Aktivasyon bekleniyor</h2>
            <p className="mx-auto mt-4 max-w-lg text-center text-sm leading-relaxed text-[var(--color-text-muted)]">
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

      <aside className="shrink-0 lg:sticky lg:top-24 lg:w-80 xl:w-96">
        <div className="ui-glass rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 p-5 shadow-[var(--shadow-soft)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--brand-yellow)]">
            İlerleme
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {allOnboardingStepsDone
              ? "Tüm adımlar tamamlandı. Personel atamanız tamamlanana kadar bu ekranda bekleyebilirsiniz."
              : "Adımlar sırayla açılır. Tamamlananlar ✓, aktif adım ⏳, sonraki adımlar 🔒."}
          </p>
          <ol className="mt-5 space-y-2">
            {ONBOARDING_STEPS.map((meta, i) => {
              const st = getStepStatus(i, step, allOnboardingStepsDone);
              return (
                <li
                  key={meta.id}
                  className={`flex gap-3 rounded-xl border px-3 py-3 transition ${
                    st === "done"
                      ? "border-emerald-500/25 bg-emerald-500/5"
                      : st === "current"
                        ? "border-[var(--brand-yellow)]/45 bg-[var(--brand-yellow)]/10"
                        : "border-[var(--color-border)]/70 bg-[var(--color-bg)]/25"
                  }`}
                >
                  <span className="text-lg leading-none" aria-hidden>
                    {stepStatusIcon(st)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                      {stepStatusLabel(st)}
                    </p>
                    <p className="text-sm font-medium text-[var(--color-text)]">{meta.label}</p>
                    <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{meta.hint}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </aside>
    </div>
  );
}
