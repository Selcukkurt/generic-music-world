"use client";

import { useToast } from "@/components/ui/ToastProvider";
import { useI18n } from "@/i18n/LocaleProvider";

type LanguageSwitchProps = {
  className?: string;
};

export default function LanguageSwitch({ className }: LanguageSwitchProps) {
  const { locale, setLocale, t } = useI18n();
  const toast = useToast();

  const handleEnClick = () => {
    toast.info(t("language_not_ready"));
  };

  return (
    <div
      className={`flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1 text-xs ${className ?? ""}`}
    >
      <button
        type="button"
        onClick={() => setLocale("tr")}
        className={`rounded-full px-3 py-1 transition ${
          locale === "tr"
            ? "bg-[var(--brand-yellow)] text-[#121212]"
            : "ui-text-secondary hover:bg-[var(--color-surface-hover)]"
        }`}
      >
        {t("header_language_tr")}
      </button>
      <span className="ui-text-muted px-1">|</span>
      <button
        type="button"
        onClick={handleEnClick}
        aria-disabled="true"
        className="cursor-not-allowed rounded-full px-3 py-1 text-[var(--color-text-muted)] opacity-60"
      >
        {t("header_language_en")}
      </button>
    </div>
  );
}
