"use client";

import Link from "next/link";

import { modulesM01ToM10, type ModuleStatus } from "@/config/modules";
import { useI18n } from "@/i18n/LocaleProvider";

const STATUS_STYLES: Record<
  ModuleStatus,
  { dot: string; badge: string; bar: string }
> = {
  active: {
    dot: "bg-[var(--color-success)]",
    badge: "text-[var(--color-success)]",
    bar: "bg-[var(--color-success)]",
  },
  in_progress: {
    dot: "bg-[var(--color-warning)]",
    badge: "text-[var(--color-warning)]",
    bar: "bg-[var(--color-warning)]",
  },
  planned: {
    dot: "bg-[var(--color-text-muted)]",
    badge: "ui-text-muted",
    bar: "bg-[var(--color-text-muted)]",
  },
};

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
          {modulesM01ToM10.map((module) => {
            const styles = STATUS_STYLES[module.status];
            const statusKey =
              module.status === "active"
                ? "module_status_active"
                : module.status === "in_progress"
                  ? "module_status_in_progress"
                  : "module_status_planned";
            return (
              <Link
                key={module.id}
                href={module.basePath}
                className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_12px_28px_rgba(7,16,35,0.25)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--color-surface2)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.28)]"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] ui-text-muted">
                      {module.code}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold">
                      {t("module_placeholder")} {module.code.slice(1)}
                    </h2>
                    <p className="ui-text-muted mt-1 truncate text-[13px] leading-snug">
                      Modül iskelet aşamasında.
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)]/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${styles.badge}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot}`}
                        aria-hidden
                      />
                      {t(statusKey)}
                    </span>
                    <div className="flex h-10 w-10 min-h-[40px] min-w-[40px] items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] text-sm ui-text-secondary transition-all duration-200 ease-out group-hover:translate-x-0.5 group-hover:border-[var(--color-surface2)] group-hover:text-[var(--color-text)]">
                      →
                    </div>
                  </div>
                </div>
                {(module.status === "active" || module.status === "in_progress") && (
                  <>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="h-0.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--color-border)]">
                        <div
                          className={`h-full ${styles.bar} transition-all duration-300`}
                          style={{ width: `${module.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] ui-text-muted tabular-nums">
                        {module.progress}%
                      </span>
                    </div>
                    <p className="ui-text-muted mt-1 text-xs">
                      {t("module_progress_label")}
                    </p>
                  </>
                )}
                <p className="ui-text-muted mt-2 text-sm">
                  {t(module.summaryKey)}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
