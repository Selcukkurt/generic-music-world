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

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm ui-text-secondary">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--brand-yellow)]/30"
          />
          {t("login_remember")}
        </label>
        <button
          type="button"
          className="text-sm ui-text-secondary hover:text-[var(--color-text)]"
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
