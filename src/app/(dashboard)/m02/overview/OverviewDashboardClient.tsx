"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PageHeader from "@/components/shell/PageHeader";
import { useI18n } from "@/i18n/LocaleProvider";
import { fetchEvents } from "@/lib/events/data";
import type { EtkinlikEvent } from "@/lib/events/types";

const STORAGE_KEY = "gmw_m02_selected_event_id";

const MOCK_CRITICAL_TASKS = [
  { id: "1", title: "Sözleşme imzalarını tamamla", due: "2026-02-15" },
  { id: "2", title: "Mekan onayı al", due: "2026-02-16" },
  { id: "3", title: "Sigorta belgesi yükle", due: "2026-02-17" },
  { id: "4", title: "Bilet satış başlangıcı", due: "2026-02-18" },
  { id: "5", title: "Ekip toplantısı", due: "2026-02-19" },
];

const MOCK_RECENT_ACTIVITY = [
  { id: "1", text: "Etkinlik oluşturuldu", time: "2 saat önce" },
  { id: "2", text: "Sözleşme eklendi", time: "5 saat önce" },
  { id: "3", text: "Görev atandı: Mekan kontrolü", time: "1 gün önce" },
  { id: "4", text: "Bütçe güncellendi", time: "1 gün önce" },
  { id: "5", text: "Ekip üyesi eklendi", time: "2 gün önce" },
  { id: "6", text: "Durum değişti: Planlama", time: "2 gün önce" },
  { id: "7", text: "Doküman yüklendi", time: "3 gün önce" },
  { id: "8", text: "Etkinlik taslağı oluşturuldu", time: "4 gün önce" },
];

const STATUS_LABELS: Record<string, string> = {
  TASLAK: "Taslak",
  PLANLAMA: "Planlama",
  CANLI: "Canlı",
  KAPANIS_HAZIRLIGI: "Kapanış Hazırlığı",
  KAPANDI: "Kapandı",
};

export default function OverviewDashboardClient() {
  const { t } = useI18n();
  const [events, setEvents] = useState<EtkinlikEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [useMock, setUseMock] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setUseMock(false);
    try {
      const list = await fetchEvents();
      setEvents(list);
      const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (list.length > 0) {
        const validStored = stored && list.some((e) => e.id === stored) ? stored : list[0].id;
        setSelectedEventId(validStored);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, validStored);
        }
      } else {
        setSelectedEventId(null);
      }
    } catch {
      const mock: EtkinlikEvent[] = [
        {
          id: "mock-1",
          name: "Örnek Etkinlik",
          date: new Date().toISOString().slice(0, 10),
          venue: "Örnek Mekan",
          status: "TASLAK",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: null,
          description: null,
          metadata: {},
        },
      ];
      setEvents(mock);
      setUseMock(true);
      setSelectedEventId(mock[0].id);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (selectedEventId && typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, selectedEventId);
    }
  }, [selectedEventId]);

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  const kpis = selectedEventId
    ? {
        upcomingEventsNext7Days: events.filter((e) => {
          const d = new Date(e.date);
          const now = new Date();
          const in7 = new Date(now);
          in7.setDate(in7.getDate() + 7);
          return d >= now && d <= in7;
        }).length,
        openCriticalTasks: 3,
        pendingApprovals: 2,
        openIncidents: 1,
      }
    : null;

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
              {ev.name} · {ev.date} {ev.venue ? `· ${ev.venue}` : ""}
            </option>
          ))}
        </select>
        {useMock && (
          <p className="mt-2 text-xs ui-text-muted">
            Supabase bağlantısı yok, mock veri kullanılıyor.
          </p>
        )}
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

      {/* Event Summary Card */}
      {selectedEvent && (
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 backdrop-blur-sm">
          <h3 className="mb-4 text-sm font-semibold text-[var(--color-text)]">
            Etkinlik Özeti
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs ui-text-muted">Tarih</p>
              <p className="font-medium">{selectedEvent.date}</p>
            </div>
            <div>
              <p className="text-xs ui-text-muted">Mekan</p>
              <p className="font-medium">{selectedEvent.venue ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs ui-text-muted">Durum</p>
              <span
                className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: "var(--color-surface-elevated)",
                  color: "var(--color-text)",
                }}
              >
                {STATUS_LABELS[selectedEvent.status] ?? selectedEvent.status}
              </span>
            </div>
            <div>
              <p className="text-xs ui-text-muted">Bütçe</p>
              <p className="font-medium">Planlanan: — / Harcanan: —</p>
            </div>
          </div>
        </section>
      )}

      {/* Critical Tasks + Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 backdrop-blur-sm">
          <h3 className="mb-4 text-sm font-semibold text-[var(--color-text)]">
            Kritik Görevler
          </h3>
          <ul className="space-y-2">
            {MOCK_CRITICAL_TASKS.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/40 px-3 py-2"
              >
                <span className="text-sm">{task.title}</span>
                <span className="text-xs ui-text-muted">{task.due}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 backdrop-blur-sm">
          <h3 className="mb-4 text-sm font-semibold text-[var(--color-text)]">
            Son Aktiviteler
          </h3>
          <ul className="space-y-2">
            {MOCK_RECENT_ACTIVITY.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/40 px-3 py-2"
              >
                <span className="text-sm">{item.text}</span>
                <span className="text-xs ui-text-muted">{item.time}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {selectedEventId && (
        <div className="flex justify-end">
          <Link
            href={`/m02/events/${selectedEventId}`}
            className="ui-button-primary rounded-lg px-4 py-2 text-sm font-medium"
          >
            {t("m02_events_title")} →
          </Link>
        </div>
      )}
    </div>
  );
}
