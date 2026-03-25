"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase/client";
import { meApiFetch } from "@/lib/me/meApiFetch";
import { ROLE_LABELS } from "@/lib/rbac/roleConfig";

type OnboardingState = {
  full_name: string | null;
  email: string | null;
  role: string | null;
  role_level: number | null;
  title: string | null;
  department: string | null;
  access_phase: string | null;
  onboarding_completed_at: string | null;
};

const STEPS = ["Hoş geldiniz", "Profil", "Rolünüz", "Tamamlandı"] as const;

export default function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<OnboardingState | null>(null);

  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");

  const loadState = useCallback(async () => {
    setError(null);
    const res = await meApiFetch("/api/me/onboarding/state");
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error((j as { error?: string }).error ?? "Durum yüklenemedi");
    }
    const data = (await res.json()) as OnboardingState;
    setState(data);
    setFullName(data.full_name?.trim() ?? "");
    setTitle(data.title?.trim() ?? "");
    setDepartment(data.department?.trim() ?? "");
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadState();
        if (cancelled) return;
        if (data.onboarding_completed_at && data.access_phase === "active") {
          router.replace("/dashboard");
          return;
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Yüklenemedi");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadState, router]);

  const retryLoad = () => {
    setError(null);
    setLoading(true);
    void loadState()
      .then((data) => {
        if (data.onboarding_completed_at && data.access_phase === "active") {
          router.replace("/dashboard");
          return;
        }
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

  const finish = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await meApiFetch("/api/me/onboarding/complete", {
        method: "POST",
        body: JSON.stringify({
          fullName,
          title,
          department,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((j as { error?: string }).error ?? "Kaydedilemedi");
      }
      await supabaseBrowser.auth.refreshSession();
      router.replace("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <p className="text-sm text-[var(--color-text-muted)]">Yükleniyor…</p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <p className="text-sm text-red-200/90">{error ?? "Profil yüklenemedi."}</p>
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

  const roleLevel = state.role_level;
  const roleLabel =
    roleLevel != null && roleLevel in ROLE_LABELS
      ? ROLE_LABELS[roleLevel as keyof typeof ROLE_LABELS]
      : null;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-10">
      <nav aria-label="Onboarding adımları" className="mb-10">
        <ol className="flex items-center justify-between gap-1">
          {STEPS.map((label, i) => (
            <li key={label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition ${
                  i === step
                    ? "bg-[var(--color-primary)] text-white shadow-md"
                    : i < step
                      ? "bg-[var(--color-surface2)] text-[var(--color-text)] ring-1 ring-[var(--color-border)]"
                      : "bg-[var(--color-bg)] text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)]"
                }`}
                aria-current={i === step ? "step" : undefined}
              >
                {i + 1}
              </span>
              <span
                className={`hidden text-center text-[10px] font-medium uppercase tracking-wide sm:block ${
                  i === step ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]"
                }`}
              >
                {label}
              </span>
            </li>
          ))}
        </ol>
      </nav>

      {error ? (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200"
        >
          {error}
        </div>
      ) : null}

      {step === 0 && (
        <div className="flex flex-col items-center text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Hoş geldiniz</h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--color-text-muted)]">
            Generic Music World&apos;e katıldığınız için teşekkürler. Birkaç kısa adımda profilinizi tamamlayıp
            panele geçeceksiniz.
          </p>
          <button
            type="button"
            onClick={() => void goNextFromWelcome()}
            disabled={submitting}
            className="mt-10 rounded-xl bg-[var(--color-primary)] px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "…" : "Başla"}
          </button>
        </div>
      )}

      {step === 1 && (
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">Profil bilgileri</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Adınızı ve iş bilgilerinizi girin.</p>
          <div className="mt-8 flex flex-col gap-4">
            <label className="block text-left">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                Ad soyad *
              </span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                className="ui-input w-full text-sm"
                required
              />
            </label>
            <label className="block text-left">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                Ünvan
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoComplete="organization-title"
                className="ui-input w-full text-sm"
              />
            </label>
            <label className="block text-left">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                Departman
              </span>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="ui-input w-full text-sm"
              />
            </label>
          </div>
          <div className="mt-10 flex justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="rounded-xl border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-hover)]"
            >
              Geri
            </button>
            <button
              type="button"
              onClick={() => {
                if (!fullName.trim()) {
                  setError("Ad soyad gerekli");
                  return;
                }
                setError(null);
                setStep(2);
              }}
              className="rounded-xl bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Devam
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">Rolünüz</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Hesabınıza atanan sistem rolü aşağıdadır. Detaylar için yöneticinize danışabilirsiniz.
          </p>
          <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/40 p-5 text-left">
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                  E-posta
                </dt>
                <dd className="mt-1 text-[var(--color-text)]">{state.email ?? "—"}</dd>
              </div>
              <div className="h-px bg-[var(--color-border)]" />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                  Rol seviyesi
                </dt>
                <dd className="mt-1 font-medium text-[var(--color-text)]">
                  {roleLevel != null ? `${roleLevel} — ${roleLabel ?? "—"}` : "—"}
                </dd>
              </div>
              {state.role ? (
                <>
                  <div className="h-px bg-[var(--color-border)]" />
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                      Rol kodu
                    </dt>
                    <dd className="mt-1 font-mono text-[var(--color-text-secondary)]">{state.role}</dd>
                  </div>
                </>
              ) : null}
            </dl>
          </div>
          <div className="mt-10 flex justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-xl border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-hover)]"
            >
              Geri
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="rounded-xl bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Devam
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">Hazırsınız</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--color-text-muted)]">
            Profiliniz kaydedilecek ve panele yönlendirileceksiniz. İyi çalışmalar.
          </p>
          <button
            type="button"
            onClick={() => void finish()}
            disabled={submitting}
            className="mt-10 rounded-xl bg-[var(--color-primary)] px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Kaydediliyor…" : "Tamamla ve panele git"}
          </button>
          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={submitting}
            className="mt-4 text-sm text-[var(--color-text-muted)] underline-offset-4 hover:underline disabled:opacity-50"
          >
            Geri
          </button>
        </div>
      )}
    </div>
  );
}
