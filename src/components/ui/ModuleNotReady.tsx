"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/LocaleProvider";

export default function ModuleNotReady() {
  const { t } = useI18n();

  return (
    <div className="ui-glass flex w-full flex-col items-center justify-center gap-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-12 backdrop-blur-sm">
      <div className="max-w-md text-center">
        <h2 className="text-xl font-semibold">{t("module_not_ready_title")}</h2>
        <p className="ui-text-muted mt-2 text-sm">
          {t("module_not_ready_subtitle")}
        </p>
      </div>
      <Link
        href="/dashboard"
        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-5 py-2.5 text-sm font-medium transition hover:bg-[var(--color-surface2)]"
      >
        {t("module_not_ready_back")}
      </Link>
    </div>
  );
}
