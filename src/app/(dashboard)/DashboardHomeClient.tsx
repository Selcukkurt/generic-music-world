"use client";

import Link from "next/link";

import { modulesM01ToM12, type ModuleStatus } from "@/config/modules";
import { useI18n } from "@/i18n/LocaleProvider";
import { useModulePlansStore, getEffectiveProgress } from "@/lib/module-plans";

type DashboardStatus = ModuleStatus | "blocked";

const STATUS_STYLES: Record<
  DashboardStatus,
  { dot: string; badge: string; bg: string }
> = {
  active: {
    dot: "bg-emerald-500",
    badge: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  in_progress: {
    dot: "bg-amber-500",
    badge: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  planned: {
    dot: "bg-zinc-500",
    badge: "text-zinc-400",
    bg: "bg-zinc-500/10",
  },
  blocked: {
    dot: "bg-red-500",
    badge: "text-red-400",
    bg: "bg-red-500/10",
  },
};

function mapPlanStatusToDashboard(
  planStatus: string | undefined
): DashboardStatus {
  if (!planStatus) return "planned";
  if (planStatus === "done") return "active";
  if (planStatus === "blocked") return "blocked";
  if (planStatus === "in_progress") return "in_progress";
  return "planned";
}

export default function DashboardHomeClient() {
  const { t } = useI18n();
  const userName = t("header_user_name");
  const plansMap = useModulePlansStore((s) => s.plans);

  return (
    <div className="flex w-full flex-col overflow-visible">
      <div className="w-full space-y-4 overflow-visible">
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
        <div className="grid grid-cols-1 gap-4 overflow-visible px-4 md:px-6 md:grid-cols-2 xl:grid-cols-4">
          {modulesM01ToM12.map((module) => {
            const plan = plansMap?.[module.id];
            const status = plan
              ? mapPlanStatusToDashboard(plan.status)
              : (module.status as DashboardStatus);
            const progressInfo = plan ? getEffectiveProgress(plan) : { progress: module.progress, label: `%${module.progress}` };
            const etaOrEnd = plan?.eta ?? plan?.plan_end ?? null;
            const showWarning =
              (plan?.status === "blocked" || plan?.risk_level === "high") ?? false;
            const styles = STATUS_STYLES[status];
            const statusKey =
              status === "active"
                ? "module_status_active"
                : status === "in_progress"
                  ? "module_status_in_progress"
                  : status === "blocked"
                    ? "module_status_blocked"
                    : "module_status_planned";
            return (
              <Link
                key={module.id}
                href={module.basePath}
                className="group relative flex min-h-[220px] cursor-pointer flex-col rounded-2xl overflow-visible transition-all duration-300 hover:z-10 hover:ring-1 hover:ring-primary/40 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)]"
              >
                <div className="flex min-h-[220px] flex-col rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.02] p-6 backdrop-blur-sm">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${styles.bg} ${styles.badge}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot}`}
                        aria-hidden
                      />
                      {t(statusKey)}
                    </span>
                    {showWarning && (
                      <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                        ⚠ Uyarı
                      </span>
                    )}
                  </div>
                  <h2 className="min-h-[56px] text-xl font-semibold leading-snug line-clamp-2 text-[var(--color-text)]">
                    {module.displayName}
                  </h2>
                  <div className="min-h-[48px] mt-2 flex-1">
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {t(module.summaryKey)}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full bg-[var(--color-primary)]"
                        style={{ width: `${progressInfo.progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium">{progressInfo.label}</span>
                  </div>
                  <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
                    {module.shortCode}
                    {etaOrEnd && (
                      <span className="ml-1 normal-case text-[var(--color-text-muted)]">
                        · ETA {etaOrEnd}
                      </span>
                    )}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
