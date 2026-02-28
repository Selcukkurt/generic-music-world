"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import PageHeader from "@/components/shell/PageHeader";
import { useI18n } from "@/i18n/LocaleProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/components/ui/ToastProvider";
import { fetchEvents, createEvent } from "@/lib/events/data";
import type { EtkinlikEvent, EventStatus } from "@/lib/events/types";

const STATUS_LABELS: Record<EventStatus, string> = {
  TASLAK: "Taslak",
  PLANLAMA: "Planlama",
  CANLI: "Canlı",
  KAPANIS_HAZIRLIGI: "Kapanış Hazırlığı",
  KAPANDI: "Kapandı",
};

const STATUS_OPTIONS: { id: EventStatus; label: string }[] = [
  { id: "TASLAK", label: "Taslak" },
  { id: "PLANLAMA", label: "Planlama" },
  { id: "CANLI", label: "Canlı" },
  { id: "KAPANIS_HAZIRLIGI", label: "Kapanış Hazırlığı" },
  { id: "KAPANDI", label: "Kapandı" },
];

const MOCK_EVENTS: EtkinlikEvent[] = [
  {
    id: "mock-1",
    name: "Yaz Konseri 2026",
    date: "2026-07-15",
    venue: "Açık Hava Sahnesi",
    status: "PLANLAMA",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: null,
    description: null,
    metadata: {},
  },
  {
    id: "mock-2",
    name: "Kış Festivali",
    date: "2026-12-20",
    venue: "Kongre Merkezi",
    status: "TASLAK",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: null,
    description: null,
    metadata: {},
  },
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
        className="w-full max-w-lg rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[var(--color-text)]">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export default function EventListClient() {
  const { t } = useI18n();
  const toast = useToast();
  const { user } = useCurrentUser();
  const [events, setEvents] = useState<EtkinlikEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [useMock, setUseMock] = useState(false);
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setUseMock(false);
    try {
      const list = await fetchEvents();
      setEvents(list);
    } catch {
      setEvents(MOCK_EVENTS);
      setUseMock(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const years = useMemo(() => {
    const set = new Set(events.map((e) => e.date.slice(0, 4)));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [events]);

  const filtered = useMemo(() => {
    let list = events;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.venue?.toLowerCase().includes(q) ?? false)
      );
    }
    if (yearFilter) {
      list = list.filter((e) => e.date.startsWith(yearFilter));
    }
    if (statusFilter) {
      list = list.filter((e) => e.status === statusFilter);
    }
    return list;
  }, [events, search, yearFilter, statusFilter]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
    const start_date = (form.elements.namedItem("start_date") as HTMLInputElement).value;
    const end_date = (form.elements.namedItem("end_date") as HTMLInputElement).value || null;
    const location = (form.elements.namedItem("location") as HTMLInputElement).value.trim() || null;
    const status = (form.elements.namedItem("status") as HTMLSelectElement).value as EventStatus;
    const budget_planned = (form.elements.namedItem("budget_planned") as HTMLInputElement).value;
    const budgetNum = budget_planned ? parseFloat(budget_planned) : null;

    if (!name || !start_date) {
      toast.error("Hata", "Etkinlik adı ve başlangıç tarihi gerekli.");
      return;
    }

    setCreateSubmitting(true);
    try {
      const created = await createEvent({
        name,
        date: start_date,
        end_date,
        venue: location,
        status,
        budget_planned: budgetNum,
        created_by: user?.id ?? null,
      });
      setEvents((prev) => [created, ...prev]);
      setShowCreateModal(false);
      toast.success("Tamamlandı", "Etkinlik oluşturuldu.");
    } catch (err) {
      if (useMock) {
        const mock: EtkinlikEvent = {
          id: `mock-${Date.now()}`,
          name,
          date: start_date,
          venue: location,
          status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: user?.id ?? null,
          description: null,
          metadata: { budget_planned: budgetNum },
        };
        setEvents((prev) => [mock, ...prev]);
        setShowCreateModal(false);
        toast.success("Tamamlandı", "Etkinlik oluşturuldu (mock).");
      } else {
        toast.error("Hata", err instanceof Error ? err.message : "Etkinlik oluşturulamadı.");
      }
    } finally {
      setCreateSubmitting(false);
    }
  };

  const formatDate = (d: string | undefined) => d || "—";
  const formatBudget = (e: EtkinlikEvent) => {
    const planned = (e.metadata as { budget_planned?: number })?.budget_planned;
    return planned != null ? `₺${planned.toLocaleString()}` : "—";
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title={t("m02_events_title")}
        subtitle={t("m02_events_subtitle")}
      >
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="ui-button-primary rounded-lg px-4 py-2 text-sm font-medium"
        >
          Yeni Etkinlik
        </button>
      </PageHeader>

      {/* Filters */}
      <section className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4">
        <input
          type="search"
          placeholder="Etkinlik ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ui-input w-full max-w-xs"
        />
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="ui-input w-32"
        >
          <option value="">Tüm yıllar</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="ui-input w-40"
        >
          <option value="">Tüm durumlar</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </section>

      {useMock && (
        <p className="text-xs ui-text-muted">
          Supabase bağlantısı yok, mock veri kullanılıyor.
        </p>
      )}

      {/* Table */}
      <section className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60">
        {loading ? (
          <div className="p-12 text-center ui-text-muted text-sm">
            {t("common_loading")}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center ui-text-muted text-sm">
            {t("m02_event_list_empty")}
          </div>
        ) : (
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Etkinlik</th>
                <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Başlangıç</th>
                <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Bitiş</th>
                <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Mekan</th>
                <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Durum</th>
                <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Bütçe</th>
                <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Son Güncelleme</th>
                <th className="px-4 py-3 text-right text-xs font-medium ui-text-muted">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ev) => (
                <tr
                  key={ev.id}
                  className="border-b border-[var(--color-border)]/50 transition hover:bg-[var(--color-surface)]/40"
                >
                  <td className="px-4 py-3 font-medium">{ev.name}</td>
                  <td className="px-4 py-3 text-sm">{formatDate(ev.date)}</td>
                  <td className="px-4 py-3 text-sm">
                    {formatDate((ev.metadata as { end_date?: string })?.end_date)}
                  </td>
                  <td className="px-4 py-3 text-sm">{ev.venue ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: "var(--color-surface-elevated)",
                        color: "var(--color-text)",
                      }}
                    >
                      {STATUS_LABELS[ev.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{formatBudget(ev)}</td>
                  <td className="px-4 py-3 text-sm ui-text-muted">
                    {ev.updated_at ? new Date(ev.updated_at).toLocaleDateString("tr-TR") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/m02/events/${ev.id}`}
                      className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                    >
                      Görüntüle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* New Event Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Yeni Etkinlik"
      >
        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium ui-text-muted">Etkinlik adı</label>
            <input name="name" type="text" className="ui-input w-full" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium ui-text-muted">Başlangıç tarihi</label>
              <input name="start_date" type="date" className="ui-input w-full" required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium ui-text-muted">Bitiş tarihi</label>
              <input name="end_date" type="date" className="ui-input w-full" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium ui-text-muted">Mekan</label>
            <input name="location" type="text" className="ui-input w-full" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium ui-text-muted">Durum</label>
            <select name="status" className="ui-input w-full">
              {STATUS_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium ui-text-muted">Planlanan bütçe (₺)</label>
            <input name="budget_planned" type="number" min="0" step="0.01" className="ui-input w-full" />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium ui-text-secondary"
            >
              {t("m02_cancel")}
            </button>
            <button
              type="submit"
              disabled={createSubmitting}
              className="ui-button-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {createSubmitting ? "…" : t("m02_create")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
