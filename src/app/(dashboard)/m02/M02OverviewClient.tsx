"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PageHeader from "@/components/shell/PageHeader";
import { useI18n } from "@/i18n/LocaleProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/components/ui/ToastProvider";
import {
  fetchUpcomingEvents,
  fetchDashboardKPIs,
  fetchActionCenterItems,
  createEvent,
  createEventIncident,
  createEventDocument,
  linkTaskToEvent,
  type DashboardKPIs,
  type ActionCenterItem,
} from "@/lib/events/data";
import { createTask, fetchDefaultBoard } from "@/lib/tasks/data";
import { TASK_PRIORITIES } from "@/lib/tasks/types";
import type { EtkinlikEvent } from "@/lib/events/types";

const SEVERITIES = [
  { id: "LOW", label: "Düşük" },
  { id: "MEDIUM", label: "Orta" },
  { id: "HIGH", label: "Yüksek" },
  { id: "CRITICAL", label: "Kritik" },
];

const DOC_TYPES = [
  { id: "contract", label: "Sözleşme" },
  { id: "insurance", label: "Sigorta" },
  { id: "venue_agreement", label: "Mekan Anlaşması" },
  { id: "other", label: "Diğer" },
];

function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[var(--color-text)]">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export default function M02OverviewClient() {
  const { t } = useI18n();
  const [events, setEvents] = useState<EtkinlikEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [actionItems, setActionItems] = useState<ActionCenterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState<
    "event" | "task" | "incident" | "document" | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const { user } = useCurrentUser();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [evList, defaultBoard] = await Promise.all([
        fetchUpcomingEvents(),
        fetchDefaultBoard(),
      ]);
      setEvents(evList);
      if (evList.length === 0) {
        setSelectedEventId(null);
      } else {
        setSelectedEventId((prev) => {
          if (!prev || !evList.find((e) => e.id === prev)) return evList[0].id;
          return prev;
        });
      }
    } catch {
      setEvents([]);
      toast.error("Hata", "Etkinlikler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedEventId) {
      setKpis(null);
      setActionItems([]);
      return;
    }
    let cancelled = false;
    async function fetch() {
      try {
        const [k, a] = await Promise.all([
          fetchDashboardKPIs(selectedEventId),
          fetchActionCenterItems(selectedEventId, 10),
        ]);
        if (!cancelled) {
          setKpis(k);
          setActionItems(a);
        }
      } catch {
        if (!cancelled) {
          setKpis(null);
          setActionItems([]);
        }
      }
    }
    fetch();
    return () => {
      cancelled = true;
    };
  }, [selectedEventId]);

  const handleCreateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
    const date = (form.elements.namedItem("date") as HTMLInputElement).value;
    const venue = (form.elements.namedItem("venue") as HTMLInputElement).value.trim() || null;
    const description = (form.elements.namedItem("description") as HTMLTextAreaElement).value.trim() || null;
    if (!name || !date) {
      toast.error("Hata", "Etkinlik adı ve tarih gerekli.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await createEvent({
        name,
        date,
        venue,
        description,
        created_by: user?.id ?? null,
      });
      setEvents((prev) => [created, ...prev]);
      setSelectedEventId(created.id);
      setModalOpen(null);
      toast.success("Tamamlandı", "Etkinlik oluşturuldu.");
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Etkinlik oluşturulamadı.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEventId || !user) return;
    const board = await fetchDefaultBoard();
    if (!board) {
      toast.error("Hata", "Görev tahtası bulunamadı.");
      return;
    }
    const form = e.currentTarget;
    const title = (form.elements.namedItem("title") as HTMLInputElement).value.trim();
    const priority = (form.elements.namedItem("priority") as HTMLSelectElement).value;
    const dueDate = (form.elements.namedItem("due_date") as HTMLInputElement).value || null;
    if (!title) {
      toast.error("Hata", "Görev başlığı gerekli.");
      return;
    }
    setSubmitting(true);
    try {
      const task = await createTask(user.id, board.id, {
        title,
        priority: priority as "low" | "normal" | "high" | "urgent",
        due_date: dueDate,
      });
      await linkTaskToEvent(task.id, selectedEventId);
      setActionItems((prev) => [
        { type: "task", id: task.id, title: task.title, dueDate: dueDate, priority, isCritical: priority === "urgent" || priority === "high" },
        ...prev.slice(0, 9),
      ]);
      setKpis((prev) =>
        prev
          ? {
              ...prev,
              openCriticalTasks:
                prev.openCriticalTasks +
                (priority === "urgent" || priority === "high" ? 1 : 0),
            }
          : null
      );
      setModalOpen(null);
      toast.success("Tamamlandı", "Görev eklendi.");
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Görev eklenemedi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportIncident = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEventId || !user) return;
    const form = e.currentTarget;
    const title = (form.elements.namedItem("title") as HTMLInputElement).value.trim();
    const description = (form.elements.namedItem("description") as HTMLTextAreaElement).value.trim() || null;
    const severity = (form.elements.namedItem("severity") as HTMLSelectElement).value;
    if (!title) {
      toast.error("Hata", "Başlık gerekli.");
      return;
    }
    setSubmitting(true);
    try {
      await createEventIncident(selectedEventId, {
        title,
        description,
        severity,
        reported_by: user.id,
      });
      setKpis((prev) =>
        prev ? { ...prev, openIncidents: prev.openIncidents + 1 } : null
      );
      setModalOpen(null);
      toast.success("Tamamlandı", "Olay bildirildi.");
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Olay bildirilemedi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEventId || !user) return;
    const form = e.currentTarget;
    const type = (form.elements.namedItem("type") as HTMLSelectElement).value;
    const url = (form.elements.namedItem("url") as HTMLInputElement).value.trim();
    const title = (form.elements.namedItem("doc_title") as HTMLInputElement).value.trim() || null;
    if (!url) {
      toast.error("Hata", "URL gerekli.");
      return;
    }
    setSubmitting(true);
    try {
      await createEventDocument(selectedEventId, {
        type,
        url,
        title,
        uploaded_by: user.id,
      });
      setActionItems((prev) => prev.filter((i) => !(i.type === "document" && i.docType === type)));
      setModalOpen(null);
      toast.success("Tamamlandı", "Doküman yüklendi.");
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Doküman yüklenemedi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title={t("m02_overview_title")}
        subtitle={t("m02_overview_subtitle")}
      />

      {/* Active Event Selector */}
      <section className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 backdrop-blur-sm">
        <label className="mb-2 block text-xs font-medium ui-text-muted">
          {t("m02_select_event")}
        </label>
        <select
          value={selectedEventId ?? ""}
          onChange={(e) => setSelectedEventId(e.target.value || null)}
          className="ui-input w-full max-w-md"
          disabled={loading}
        >
          <option value="">{t("m02_no_event_selected")}</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name} {ev.date} {ev.venue ? `· ${ev.venue}` : ""}
            </option>
          ))}
        </select>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis ? (
          <>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4">
              <p className="text-2xl font-bold text-[var(--color-text)]">
                {kpis.upcomingEventsNext7Days}
              </p>
              <p className="mt-1 text-sm ui-text-muted">{t("m02_kpi_upcoming_7d")}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4">
              <p className="text-2xl font-bold text-[var(--color-text)]">
                {kpis.openCriticalTasks}
              </p>
              <p className="mt-1 text-sm ui-text-muted">{t("m02_kpi_critical_tasks")}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4">
              <p className="text-2xl font-bold text-[var(--color-text)]">
                {kpis.pendingApprovals}
              </p>
              <p className="mt-1 text-sm ui-text-muted">{t("m02_kpi_pending_approvals")}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4">
              <p className="text-2xl font-bold text-[var(--color-text)]">
                {kpis.openIncidents}
              </p>
              <p className="mt-1 text-sm ui-text-muted">{t("m02_kpi_open_incidents_count")}</p>
            </div>
          </>
        ) : (
          <div className="col-span-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-8 text-center">
            <p className="ui-text-muted text-sm">
              {selectedEventId ? t("common_loading") : t("m02_select_event_first")}
            </p>
          </div>
        )}
      </section>

      {/* Action Center + Quick Actions row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 backdrop-blur-sm">
          <h3 className="mb-4 text-sm font-semibold text-[var(--color-text)]">
            {t("m02_action_center_title")}
          </h3>
          {actionItems.length === 0 ? (
            <p className="ui-text-muted py-8 text-center text-sm">
              {t("m02_action_center_empty")}
            </p>
          ) : (
            <ul className="space-y-2">
              {actionItems.map((item) =>
                item.type === "task" ? (
                  <li key={item.id}>
                    <Link
                      href="/events"
                      className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/40 px-3 py-2 transition-colors hover:bg-[var(--color-surface)]/80"
                    >
                      <span className="text-sm">{item.title}</span>
                      <span className="text-xs ui-text-muted">
                        {item.isCritical ? t("m02_action_task_due") : item.dueDate ?? ""}
                      </span>
                    </Link>
                  </li>
                ) : (
                  <li key={`${item.type}-${item.docType}`}>
                    <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                      <span className="text-sm">{item.label}</span>
                      <span className="text-xs ui-text-muted">{t("m02_action_doc_missing")}</span>
                    </div>
                  </li>
                )
              )}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 backdrop-blur-sm">
          <h3 className="mb-4 text-sm font-semibold text-[var(--color-text)]">
            {t("m02_quick_actions_title")}
          </h3>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setModalOpen("event")}
              className="ui-button-primary rounded-lg px-4 py-2 text-sm font-medium"
            >
              {t("m02_quick_create_event")}
            </button>
            <button
              type="button"
              onClick={() => setModalOpen("task")}
              disabled={!selectedEventId}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
            >
              {t("m02_quick_add_task")}
            </button>
            <button
              type="button"
              onClick={() => setModalOpen("incident")}
              disabled={!selectedEventId}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
            >
              {t("m02_quick_report_incident")}
            </button>
            <button
              type="button"
              onClick={() => setModalOpen("document")}
              disabled={!selectedEventId}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
            >
              {t("m02_quick_upload_doc")}
            </button>
          </div>
          {selectedEventId && (
            <Link
              href={`/m02/events/${selectedEventId}`}
              className="mt-4 block text-center text-sm font-medium text-[var(--color-text)] underline hover:no-underline"
            >
              {t("m02_events_title")} →
            </Link>
          )}
        </section>
      </div>

      {/* Modals */}
      <Modal
        isOpen={modalOpen === "event"}
        onClose={() => setModalOpen(null)}
        title={t("m02_modal_create_event")}
      >
        <form onSubmit={handleCreateEvent} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium ui-text-muted">
              {t("m02_modal_event_name")}
            </label>
            <input name="name" type="text" className="ui-input w-full" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium ui-text-muted">
              {t("m02_modal_event_date")}
            </label>
            <input name="date" type="date" className="ui-input w-full" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium ui-text-muted">
              {t("m02_modal_event_venue")}
            </label>
            <input name="venue" type="text" className="ui-input w-full" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium ui-text-muted">
              {t("m02_modal_event_desc")}
            </label>
            <textarea name="description" className="ui-input w-full min-h-[80px]" />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(null)}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium ui-text-secondary"
            >
              {t("m02_cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="ui-button-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? "…" : t("m02_create")}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={modalOpen === "task"}
        onClose={() => setModalOpen(null)}
        title={t("m02_modal_add_task")}
      >
        <form onSubmit={handleAddTask} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium ui-text-muted">
              {t("m02_modal_task_title")}
            </label>
            <input name="title" type="text" className="ui-input w-full" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium ui-text-muted">
              Öncelik
            </label>
            <select name="priority" className="ui-input w-full">
              {TASK_PRIORITIES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium ui-text-muted">
              Bitiş Tarihi
            </label>
            <input name="due_date" type="date" className="ui-input w-full" />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(null)}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium ui-text-secondary"
            >
              {t("m02_cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="ui-button-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? "…" : t("m02_create")}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={modalOpen === "incident"}
        onClose={() => setModalOpen(null)}
        title={t("m02_modal_report_incident")}
      >
        <form onSubmit={handleReportIncident} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium ui-text-muted">
              {t("m02_modal_incident_title")}
            </label>
            <input name="title" type="text" className="ui-input w-full" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium ui-text-muted">
              {t("m02_modal_incident_desc")}
            </label>
            <textarea name="description" className="ui-input w-full min-h-[80px]" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium ui-text-muted">
              {t("m02_modal_incident_severity")}
            </label>
            <select name="severity" className="ui-input w-full">
              {SEVERITIES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(null)}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium ui-text-secondary"
            >
              {t("m02_cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="ui-button-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? "…" : t("m02_create")}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={modalOpen === "document"}
        onClose={() => setModalOpen(null)}
        title={t("m02_modal_upload_doc")}
      >
        <form onSubmit={handleUploadDocument} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium ui-text-muted">
              {t("m02_modal_doc_type")}
            </label>
            <select name="type" className="ui-input w-full">
              {DOC_TYPES.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium ui-text-muted">
              {t("m02_modal_doc_url")}
            </label>
            <input name="url" type="url" className="ui-input w-full" placeholder="https://..." required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium ui-text-muted">
              {t("m02_modal_doc_title")}
            </label>
            <input name="doc_title" type="text" className="ui-input w-full" />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(null)}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium ui-text-secondary"
            >
              {t("m02_cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="ui-button-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? "…" : t("m02_upload")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
