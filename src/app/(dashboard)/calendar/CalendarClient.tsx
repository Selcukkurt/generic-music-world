"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import PageHeader from "@/components/shell/PageHeader";
import CalendarMonthView from "./CalendarMonthView";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/components/ui/ToastProvider";
import {
  fetchCalendarEvents,
  fetchCalendarEventsByMonth,
  fetchPendingEvents,
  createCalendarEvent,
  approveEvent,
  rejectEvent,
  cancelEvent,
  updateCalendarEvent,
} from "@/lib/calendar/data";
import type { CalendarEvent } from "@/lib/calendar/types";
import {
  EVENT_TYPES,
  EVENT_STATUSES,
  statusBadgeClass,
  typeBadgeClass,
  formatDateTimeRange,
} from "@/lib/calendar/types";

const ADMIN_ROLES = ["system_owner", "ceo", "admin"];

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CalendarClient() {
  const toast = useToast();
  const { user } = useCurrentUser();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [pendingEvents, setPendingEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectTarget, setRejectTarget] = useState<CalendarEvent | null>(null);
  const [editTarget, setEditTarget] = useState<CalendarEvent | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [createPrefillDate, setCreatePrefillDate] = useState<Date | null>(null);

  const isAdmin = user ? ADMIN_ROLES.includes(user.role) : false;

  const loadCalendarMonth = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [list, pending] = await Promise.all([
        fetchCalendarEventsByMonth(user.id, isAdmin, calendarMonth.year, calendarMonth.month, {
          status: statusFilter !== "all" ? statusFilter : undefined,
          eventType: typeFilter !== "all" ? typeFilter : undefined,
        }),
        isAdmin ? fetchPendingEvents(user.id) : Promise.resolve([]),
      ]);
      setEvents(list);
      setPendingEvents(pending);
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Kayıtlar yüklenemedi.");
      setEvents([]);
      setPendingEvents([]);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, calendarMonth.year, calendarMonth.month, statusFilter, typeFilter, toast]);

  const loadList = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [list, pending] = await Promise.all([
        fetchCalendarEvents(user.id, isAdmin, {
          status: statusFilter !== "all" ? statusFilter : undefined,
          eventType: typeFilter !== "all" ? typeFilter : undefined,
        }),
        isAdmin ? fetchPendingEvents(user.id) : Promise.resolve([]),
      ]);
      setEvents(list);
      setPendingEvents(pending);
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Kayıtlar yüklenemedi.");
      setEvents([]);
      setPendingEvents([]);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, statusFilter, typeFilter, toast]);

  const load = useMemo(() => (viewMode === "calendar" ? loadCalendarMonth : loadList), [viewMode, loadCalendarMonth, loadList]);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user, load]);

  const handleCreate = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!user) return;
      const form = e.currentTarget;
      const title = (form.elements.namedItem("title") as HTMLInputElement).value.trim();
      const description = (form.elements.namedItem("description") as HTMLTextAreaElement).value.trim() || null;
      const startAt = (form.elements.namedItem("start_at") as HTMLInputElement).value;
      const endAt = (form.elements.namedItem("end_at") as HTMLInputElement).value;
      const eventType = (form.elements.namedItem("event_type") as HTMLSelectElement).value;
      const location = (form.elements.namedItem("location") as HTMLInputElement).value.trim() || null;
      const visibility = (form.elements.namedItem("visibility") as HTMLSelectElement).value;
      if (!title || !startAt || !endAt) {
        toast.error("Hata", "Başlık, başlangıç ve bitiş tarihi gerekli.");
        return;
      }
      setCreateSubmitting(true);
      try {
        const created = await createCalendarEvent(user.id, {
          title,
          description,
          start_at: new Date(startAt).toISOString(),
          end_at: new Date(endAt).toISOString(),
          event_type: eventType,
          location,
          visibility,
        });
        setShowCreateModal(false);
        setCreatePrefillDate(null);
        setSelected(created);
        load();
        toast.success("Tamamlandı", "Plan oluşturuldu.");
      } catch (err) {
        toast.error("Hata", err instanceof Error ? err.message : "Plan oluşturulamadı.");
      } finally {
        setCreateSubmitting(false);
      }
    },
    [user, load, toast]
  );

  const handleApprove = useCallback(
    async (ev: CalendarEvent) => {
      if (!user || !isAdmin || ev.status !== "pending") return;
      const prev = [...events];
      const prevPending = [...pendingEvents];
      setEvents((list) =>
        list.map((x) =>
          x.id === ev.id
            ? { ...x, status: "approved" as const, decided_by: user.id, decided_at: new Date().toISOString(), decision_reason: null }
            : x
        )
      );
      setPendingEvents((list) => list.filter((x) => x.id !== ev.id));
      if (selected?.id === ev.id) {
        setSelected((s) =>
          s?.id === ev.id
            ? { ...s, status: "approved" as const, decided_by: user.id, decided_at: new Date().toISOString(), decision_reason: null }
            : s
        );
      }
      try {
        await approveEvent(ev.id, user.id);
        toast.success("Tamamlandı", "Plan onaylandı.");
      } catch {
        setEvents(prev);
        setPendingEvents(prevPending);
        setSelected(events.find((x) => x.id === ev.id) ?? null);
        toast.error("Hata", "Onaylama başarısız.");
      }
    },
    [user, isAdmin, events, pendingEvents, selected, toast]
  );

  const handleRejectClick = useCallback((ev: CalendarEvent) => {
    setRejectTarget(ev);
    setRejectReason("");
    setShowRejectModal(true);
  }, []);

  const handleRejectSubmit = useCallback(async () => {
    if (!user || !isAdmin || !rejectTarget || !rejectReason.trim()) return;
    setRejectSubmitting(true);
    const prev = [...events];
    const prevPending = [...pendingEvents];
    setEvents((list) =>
      list.map((x) =>
        x.id === rejectTarget.id
          ? {
              ...x,
              status: "rejected" as const,
              decided_by: user.id,
              decided_at: new Date().toISOString(),
              decision_reason: rejectReason.trim(),
            }
          : x
      )
    );
    setPendingEvents((list) => list.filter((x) => x.id !== rejectTarget.id));
    if (selected?.id === rejectTarget.id) {
      setSelected((s) =>
        s?.id === rejectTarget.id
          ? {
              ...s,
              status: "rejected" as const,
              decided_by: user.id,
              decided_at: new Date().toISOString(),
              decision_reason: rejectReason.trim(),
            }
          : s
      );
    }
    try {
      await rejectEvent(rejectTarget.id, user.id, rejectReason.trim());
      setShowRejectModal(false);
      setRejectTarget(null);
      setRejectReason("");
      toast.success("Tamamlandı", "Plan reddedildi.");
    } catch {
      setEvents(prev);
      setPendingEvents(prevPending);
      setSelected(events.find((x) => x.id === rejectTarget.id) ?? null);
      toast.error("Hata", "Reddetme başarısız.");
    } finally {
      setRejectSubmitting(false);
    }
  }, [user, isAdmin, rejectTarget, rejectReason, events, pendingEvents, selected, toast]);

  const handleEdit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!user || !editTarget || editTarget.created_by !== user.id || editTarget.status !== "pending") return;
      const form = e.currentTarget;
      const title = (form.elements.namedItem("edit_title") as HTMLInputElement).value.trim();
      const description = (form.elements.namedItem("edit_description") as HTMLTextAreaElement).value.trim() || null;
      const startAt = (form.elements.namedItem("edit_start_at") as HTMLInputElement).value;
      const endAt = (form.elements.namedItem("edit_end_at") as HTMLInputElement).value;
      const eventType = (form.elements.namedItem("edit_event_type") as HTMLSelectElement).value;
      const location = (form.elements.namedItem("edit_location") as HTMLInputElement).value.trim() || null;
      const visibility = (form.elements.namedItem("edit_visibility") as HTMLSelectElement).value;
      if (!title || !startAt || !endAt) {
        toast.error("Hata", "Başlık, başlangıç ve bitiş tarihi gerekli.");
        return;
      }
      setEditSubmitting(true);
      try {
        await updateCalendarEvent(editTarget.id, user.id, {
          title,
          description,
          start_at: new Date(startAt).toISOString(),
          end_at: new Date(endAt).toISOString(),
          event_type: eventType as CalendarEvent["event_type"],
          location,
          visibility: visibility as CalendarEvent["visibility"],
        });
        const updated: CalendarEvent = {
          ...editTarget,
          title,
          description,
          start_at: new Date(startAt).toISOString(),
          end_at: new Date(endAt).toISOString(),
          event_type: eventType as CalendarEvent["event_type"],
          location,
          visibility: visibility as CalendarEvent["visibility"],
        };
        setEvents((prev) =>
          prev.map((x) => (x.id === editTarget.id ? updated : x)).sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
        );
        setSelected(updated);
        setShowEditModal(false);
        setEditTarget(null);
        toast.success("Tamamlandı", "Plan güncellendi.");
      } catch (err) {
        toast.error("Hata", err instanceof Error ? err.message : "Plan güncellenemedi.");
      } finally {
        setEditSubmitting(false);
      }
    },
    [user, editTarget, toast]
  );

  const handleCancel = useCallback(
    async (ev: CalendarEvent) => {
      if (!user || ev.created_by !== user.id || ev.status !== "pending") return;
      const prev = [...events];
      setEvents((list) =>
        list.map((x) => (x.id === ev.id ? { ...x, status: "cancelled" as const } : x))
      );
      if (selected?.id === ev.id) {
        setSelected((s) => (s?.id === ev.id ? { ...s, status: "cancelled" as const } : s));
      }
      try {
        await cancelEvent(ev.id, user.id);
        toast.success("Tamamlandı", "Plan iptal edildi.");
      } catch {
        setEvents(prev);
        setSelected(events.find((x) => x.id === ev.id) ?? null);
        toast.error("Hata", "İptal başarısız.");
      }
    },
    [user, events, selected, toast]
  );

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Takvim & Planlama"
        subtitle="Planları görüntüle, yeni kayıt oluştur ve onay sürecini yönet."
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                viewMode === "list" ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow" : "ui-text-muted hover:text-[var(--color-text)]"
              }`}
            >
              Liste
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                viewMode === "calendar" ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow" : "ui-text-muted hover:text-[var(--color-text)]"
              }`}
            >
              Takvim
            </button>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="ui-input w-36 py-2 text-sm"
          >
            <option value="all">Tümü</option>
            {EVENT_STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="ui-input w-36 py-2 text-sm"
          >
            <option value="all">Tümü</option>
            {EVENT_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setCreatePrefillDate(null);
              setShowCreateModal(true);
            }}
            className="ui-button-primary rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Yeni Plan
          </button>
        </div>
      </PageHeader>

      {isAdmin && pendingEvents.length > 0 && (
        <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 backdrop-blur-sm">
          <h2 className="mb-3 text-base font-semibold text-[var(--color-text)]">Bekleyen Onaylar</h2>
          <div className="flex flex-wrap gap-2">
            {pendingEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/50 px-3 py-2"
              >
                <span className="font-medium text-[var(--color-text)]">{ev.title}</span>
                <span className="text-xs ui-text-muted">{formatDateTimeRange(ev.start_at, ev.end_at)}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleApprove(ev)}
                    className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/30"
                  >
                    Onayla
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectClick(ev)}
                    className="rounded-full bg-red-500/20 px-2 py-1 text-xs font-medium text-red-200 transition hover:bg-red-500/30"
                  >
                    Reddet
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
        <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden backdrop-blur-sm">
          <h2 className="border-b border-[var(--color-border)] px-4 py-3 text-base font-semibold text-[var(--color-text)]">
            Takvim Kayıtları
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-surface2)]" />
            </div>
          ) : viewMode === "list" ? (
            events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <p className="text-sm font-medium text-[var(--color-text)]">
                  {statusFilter !== "all" || typeFilter !== "all" ? "Bu filtrelerde sonuç yok." : "Henüz kayıt yok."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {events.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setSelected(ev)}
                    className={`flex w-full flex-col gap-2 p-4 text-left transition hover:bg-[var(--color-surface-hover)]/50 ${
                      selected?.id === ev.id ? "bg-[var(--brand-yellow)]/10" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-[var(--color-text)]">{ev.title}</p>
                      <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClass(ev.status)}`}>
                        {EVENT_STATUSES.find((s) => s.id === ev.status)?.label ?? ev.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs ui-text-muted">{formatDateTimeRange(ev.start_at, ev.end_at)}</span>
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${typeBadgeClass()}`}>
                        {EVENT_TYPES.find((t) => t.id === ev.event_type)?.label ?? ev.event_type}
                      </span>
                    </div>
                    <p className="text-xs ui-text-muted">Oluşturan: —</p>
                  </button>
                ))}
              </div>
            )
          ) : (
            <CalendarMonthView
              year={calendarMonth.year}
              month={calendarMonth.month}
              events={events}
              loading={loading}
              onPrevMonth={() =>
                setCalendarMonth((m) => {
                  if (m.month === 0) return { year: m.year - 1, month: 11 };
                  return { year: m.year, month: m.month - 1 };
                })
              }
              onNextMonth={() =>
                setCalendarMonth((m) => {
                  if (m.month === 11) return { year: m.year + 1, month: 0 };
                  return { year: m.year, month: m.month + 1 };
                })
              }
              onToday={() => {
                const n = new Date();
                setCalendarMonth({ year: n.getFullYear(), month: n.getMonth() });
              }}
              onSelectEvent={(ev) => setSelected(ev)}
              onDayClick={(date) => {
                setCreatePrefillDate(date);
                setShowCreateModal(true);
              }}
              selectedId={selected?.id}
            />
          )}
        </div>

        <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 backdrop-blur-sm lg:min-h-[300px]">
          {selected ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[var(--color-text)]">{selected.title}</h3>
              <div className="flex flex-wrap gap-2">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClass(selected.status)}`}>
                  {EVENT_STATUSES.find((s) => s.id === selected.status)?.label}
                </span>
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${typeBadgeClass()}`}>
                  {EVENT_TYPES.find((t) => t.id === selected.event_type)?.label}
                </span>
              </div>
              <p className="text-sm ui-text-muted">{formatDateTimeRange(selected.start_at, selected.end_at)}</p>
              {selected.description && (
                <p className="text-sm ui-text-secondary">{selected.description}</p>
              )}
              {selected.location && (
                <p className="text-sm ui-text-secondary">Konum: {selected.location}</p>
              )}
              <p className="text-xs ui-text-muted">Oluşturan: —</p>
              {selected.decided_at && (
                <p className="text-xs ui-text-muted">
                  Karar: {new Date(selected.decided_at).toLocaleString("tr-TR")}
                  {selected.decision_reason && ` — ${selected.decision_reason}`}
                </p>
              )}
              {Object.keys(selected.metadata).length > 0 && (
                <details className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/50">
                  <summary className="cursor-pointer px-3 py-2 text-sm ui-text-muted">Metadata</summary>
                  <pre className="max-h-40 overflow-auto p-3 text-xs ui-text-secondary">
                    {JSON.stringify(selected.metadata, null, 2)}
                  </pre>
                </details>
              )}
              {selected.status === "pending" && isAdmin && (
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(selected)}
                    className="ui-button-primary rounded-lg px-4 py-2 text-sm font-semibold"
                  >
                    Onayla
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectClick(selected)}
                    className="rounded-lg border border-red-500/50 bg-red-500/20 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/30"
                  >
                    Reddet
                  </button>
                </div>
              )}
              {selected.status === "pending" && user?.id === selected.created_by && (
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditTarget(selected);
                      setShowEditModal(true);
                    }}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
                  >
                    Düzenle
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCancel(selected)}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
                  >
                    İptal Et
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm ui-text-muted">Detayları görmek için bir kayıt seçin.</p>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreateModal(false);
              setCreatePrefillDate(null);
            }
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Yeni Plan</h2>
            <form
              key={createPrefillDate?.toISOString() ?? "empty"}
              onSubmit={handleCreate}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Başlık</label>
                <input name="title" type="text" className="ui-input w-full" placeholder="Plan başlığı" required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Açıklama</label>
                <textarea name="description" className="ui-input w-full min-h-[80px]" placeholder="Plan detayları" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium ui-text-muted">Başlangıç</label>
                  <input
                    name="start_at"
                    type="datetime-local"
                    className="ui-input w-full"
                    defaultValue={
                      createPrefillDate
                        ? toDatetimeLocal(
                            new Date(
                              createPrefillDate.getFullYear(),
                              createPrefillDate.getMonth(),
                              createPrefillDate.getDate(),
                              9,
                              0
                            ).toISOString()
                          )
                        : undefined
                    }
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium ui-text-muted">Bitiş</label>
                  <input
                    name="end_at"
                    type="datetime-local"
                    className="ui-input w-full"
                    defaultValue={
                      createPrefillDate
                        ? toDatetimeLocal(
                            new Date(
                              createPrefillDate.getFullYear(),
                              createPrefillDate.getMonth(),
                              createPrefillDate.getDate(),
                              10,
                              0
                            ).toISOString()
                          )
                        : undefined
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Tür</label>
                <select name="event_type" className="ui-input w-full">
                  {EVENT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Konum</label>
                <input name="location" type="text" className="ui-input w-full" placeholder="Konum" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Görünürlük</label>
                <select name="visibility" className="ui-input w-full">
                  <option value="private">Özel</option>
                  <option value="team">Ekip</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreatePrefillDate(null);
                  }}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="ui-button-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {createSubmitting ? "Oluşturuluyor…" : "Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editTarget && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && (setShowEditModal(false), setEditTarget(null))}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Planı Düzenle</h2>
            <form onSubmit={handleEdit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Başlık</label>
                <input
                  name="edit_title"
                  type="text"
                  className="ui-input w-full"
                  defaultValue={editTarget.title}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Açıklama</label>
                <textarea
                  name="edit_description"
                  className="ui-input w-full min-h-[80px]"
                  defaultValue={editTarget.description ?? ""}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium ui-text-muted">Başlangıç</label>
                  <input
                    name="edit_start_at"
                    type="datetime-local"
                    className="ui-input w-full"
                    defaultValue={toDatetimeLocal(editTarget.start_at)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium ui-text-muted">Bitiş</label>
                  <input
                    name="edit_end_at"
                    type="datetime-local"
                    className="ui-input w-full"
                    defaultValue={toDatetimeLocal(editTarget.end_at)}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Tür</label>
                <select name="edit_event_type" className="ui-input w-full" defaultValue={editTarget.event_type}>
                  {EVENT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Konum</label>
                <input
                  name="edit_location"
                  type="text"
                  className="ui-input w-full"
                  defaultValue={editTarget.location ?? ""}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Görünürlük</label>
                <select name="edit_visibility" className="ui-input w-full" defaultValue={editTarget.visibility}>
                  <option value="private">Özel</option>
                  <option value="team">Ekip</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditTarget(null);
                  }}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="ui-button-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {editSubmitting ? "Kaydediliyor…" : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRejectModal && rejectTarget && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowRejectModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Reddetme nedeni</h2>
            <p className="mt-1 text-sm ui-text-muted">Planı reddetmek için bir neden girin.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="ui-input mt-4 min-h-[100px] w-full"
              placeholder="Reddetme nedeni…"
              required
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectTarget(null);
                  setRejectReason("");
                }}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                disabled={!rejectReason.trim() || rejectSubmitting}
                className="rounded-lg border border-red-500/50 bg-red-500/20 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/30 disabled:opacity-50"
              >
                {rejectSubmitting ? "Reddediliyor…" : "Reddet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
