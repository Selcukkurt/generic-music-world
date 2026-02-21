"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase/client";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/ToastProvider";
import { useI18n } from "@/i18n/LocaleProvider";

export default function LoginForm() {
  const router = useRouter();
  const toast = useToast();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<{
    title: string;
    body: string;
    helper?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
      setIsLoading(true);
    setErrorMessage(null);
    let didTimeout = false;
    const timeoutId = window.setTimeout(() => {
      didTimeout = true;
      setIsLoading(false);
      setErrorMessage({
        title: t("login_timeout_title"),
        body: t("login_timeout_body"),
      });
    }, 10000);

    try {
      const { error } = await supabaseBrowser.auth.signInWithPassword({
        email,
        password,
      });

      if (didTimeout) {
        return;
      }

      if (error) {
        const code = error.code ?? "";
        const lowerMessage = error.message.toLowerCase();

        if (
          code === "invalid_credentials" ||
          lowerMessage.includes("invalid login credentials")
        ) {
          setErrorMessage({
            title: t("login_invalid_title"),
            body: t("login_invalid_body"),
            helper: t("login_invalid_helper"),
          });
          toast.error(
            t("login_invalid_toast_title"),
            t("login_invalid_toast_body")
          );
        } else if (code === "too_many_requests" || code === "rate_limit") {
          setErrorMessage({
            title: t("login_rate_title"),
            body: t("login_rate_body"),
            helper: t("login_rate_helper"),
          });
          toast.info(t("login_rate_toast_title"), t("login_rate_toast_body"));
        } else if (
          lowerMessage.includes("network") ||
          lowerMessage.includes("fetch")
        ) {
          setErrorMessage({
            title: t("login_network_title"),
            body: t("login_network_body"),
            helper: t("login_network_helper"),
          });
          toast.error(
            t("login_network_toast_title"),
            t("login_network_toast_body")
          );
        } else {
          setErrorMessage({
            title: t("login_generic_title"),
            body: t("login_generic_body"),
          });
          toast.error(
            t("login_generic_toast_title"),
            t("login_generic_toast_body")
          );
        }
        return;
      }

      toast.success(t("login_success_title"), t("login_success_body"));
      router.replace("/dashboard");
    } catch {
      if (!didTimeout) {
        setErrorMessage({
          title: t("login_generic_title"),
          body: t("login_generic_body"),
        });
        toast.error(
          t("login_generic_toast_title"),
          t("login_generic_toast_body")
        );
      }
    } finally {
      window.clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  return (
    <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
      <label className="block text-xs uppercase tracking-[0.2em] ui-text-muted">
        {t("login_email_label")}
        <input
          type="email"
          name="email"
          placeholder={t("login_email_placeholder")}
          className="ui-input mt-2 text-sm"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>

      <label className="block text-xs uppercase tracking-[0.2em] ui-text-muted">
        {t("login_password_label")}
        <input
          type="password"
          name="password"
          placeholder={t("login_password_placeholder")}
          className="ui-input mt-2 text-sm"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <label
          htmlFor="login-remember"
          className="flex cursor-pointer items-center gap-2 text-[var(--color-text-secondary)]"
        >
          <span className="relative flex h-4 w-4 min-h-4 min-w-4 shrink-0 items-center justify-center">
            <input
              id="login-remember"
              type="checkbox"
              className="peer sr-only"
            />
            <span
              className="pointer-events-none absolute inset-0 rounded border-2 border-[var(--color-border)] bg-[var(--color-bg)] transition-colors peer-checked:border-[var(--brand-yellow)] peer-checked:bg-[var(--brand-yellow)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--brand-yellow)]/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--color-surface)]"
              aria-hidden
            />
            <svg
              className="pointer-events-none absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 text-[#121212] opacity-0 transition-opacity peer-checked:opacity-100"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          {t("login_remember")}
        </label>
        <button
          type="button"
          className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
        >
          {t("login_forgot")}
        </button>
      </div>

      {errorMessage ? (
        <ErrorState
          title={errorMessage.title}
          message={errorMessage.body}
          helper={errorMessage.helper}
        />
      ) : null}

      <button
        type="submit"
        className="ui-button-primary px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="relative h-5 w-5">
            <img
              src="/brand-loader.gif"
              alt={t("common_loading")}
              className="h-5 w-5"
            />
            </span>
          {t("login_loading")}
          </span>
        ) : (
        t("login_submit")
        )}
      </button>

    </form>
  );
}
