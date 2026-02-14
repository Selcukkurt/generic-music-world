"use client";

import Link from "next/link";

import { modulesM01ToM10 } from "@/config/modules";
import { useI18n } from "@/i18n/LocaleProvider";

export default function DashboardHomeClient() {
  const { t } = useI18n();
  const userName = t("header_user_name");

  return (
    <div className="flex w-full flex-col">
      <div className="w-full space-y-4">
        <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-5 backdrop-blur-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="ui-heading-card">
                {t("welcome_greeting")}, {userName}
              </h2>
              <p className="ui-text-muted mt-1 text-sm">
                {t("welcome_helper")}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 sm:mt-0">
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)]/60 px-3 py-1 text-xs ui-text-muted">
                {t("welcome_alerts")}: 0
              </span>
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)]/60 px-3 py-1 text-xs ui-text-muted">
                {t("welcome_pending")}: 0
              </span>
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)]/60 px-3 py-1 text-xs ui-text-muted">
                {t("welcome_today")}: 0
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h1 className="ui-heading-page">{t("home_page_title")}</h1>
          <span className="text-xs ui-text-muted">{t("home_quick_access")}</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modulesM01ToM10.map((module) => (
            <Link
              key={module.id}
              href={module.basePath}
              className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_12px_28px_rgba(7,16,35,0.25)] transition-all duration-200 ease-out hover:-translate-y-1.5 hover:border-[var(--color-surface2)] hover:bg-[color-mix(in_srgb,var(--color-surface)_97%,white)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.28)]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] ui-text-muted">
                    {module.code}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">
                    {t("module_placeholder")} {module.code.slice(1)}
                  </h2>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)]/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ui-text-muted">
                    {module.id === "m01" ? t("module_card_status_active") : t("module_card_status_draft")}
                  </span>
                  <div className="flex h-10 w-10 min-h-[40px] min-w-[40px] items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] text-sm ui-text-secondary transition-all duration-200 ease-out group-hover:translate-x-0.5 group-hover:border-[var(--color-surface2)] group-hover:text-[var(--color-text)]">
                    →
                  </div>
                </div>
              </div>
              <p className="ui-text-muted mt-4 text-sm">
                {t("module_card_subtitle")}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
