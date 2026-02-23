"use client";

import { useI18n } from "@/i18n/LocaleProvider";
import type { EtkinlikEvent, EventClosureChecklist } from "@/lib/events/types";

type Props = {
  eventId: string;
  event: EtkinlikEvent;
  checklist: EventClosureChecklist | null;
  onCloseEvent: () => void;
  closing: boolean;
  onRefresh: () => void;
};

export default function KapanisRaporTab({
  event,
  checklist,
  onCloseEvent,
  closing,
}: Props) {
  const { t } = useI18n();
  const canClose = checklist?.all_passed ?? false;
  const isAlreadyClosed = event.status === "KAPANDI";

  return (
    <div className="flex flex-col gap-6">
      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-6 backdrop-blur-sm">
        <h3 className="mb-4 font-medium">{t("m02_closing_checklist_title")}</h3>
        <ul className="flex flex-col gap-2">
          <ChecklistItem
            passed={checklist?.no_open_critical_tasks ?? false}
            label={t("m02_closing_checklist_no_critical_tasks")}
          />
          <ChecklistItem
            passed={checklist?.no_open_incidents ?? false}
            label={t("m02_closing_checklist_no_incidents")}
          />
          <ChecklistItem
            passed={checklist?.revenue_completed ?? false}
            label={t("m02_closing_checklist_revenue_done")}
          />
          <ChecklistItem
            passed={checklist?.expense_completed ?? false}
            label={t("m02_closing_checklist_expense_done")}
          />
          <ChecklistItem
            passed={checklist?.docs_uploaded ?? false}
            label={t("m02_closing_checklist_docs_uploaded")}
          />
        </ul>
      </div>

      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-6 backdrop-blur-sm">
        <button
          type="button"
          onClick={onCloseEvent}
          disabled={!canClose || isAlreadyClosed || closing}
          title={!canClose ? t("m02_close_event_disabled") : undefined}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 font-medium text-[var(--color-primary-contrast)] transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {closing ? t("common_loading") : t("m02_close_event_btn")}
        </button>
        {!canClose && !isAlreadyClosed && (
          <p className="ui-text-muted mt-2 text-sm">{t("m02_close_event_disabled")}</p>
        )}
        {isAlreadyClosed && (
          <p className="ui-text-muted mt-2 text-sm">Bu etkinlik zaten kapatılmış.</p>
        )}
      </div>
    </div>
  );
}

function ChecklistItem({ passed, label }: { passed: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className="inline-block h-4 w-4 rounded-full"
        style={{
          backgroundColor: passed ? "var(--color-success)" : "var(--color-border)",
        }}
        aria-hidden
      />
      <span className={passed ? "" : "ui-text-muted"}>{label}</span>
    </li>
  );
}
