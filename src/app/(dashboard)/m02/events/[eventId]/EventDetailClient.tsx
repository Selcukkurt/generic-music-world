"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useI18n } from "@/i18n/LocaleProvider";
import {
  fetchEvent,
  fetchEventClosureChecklist,
  fetchEventFinancialsSummary,
  fetchEventIncidents,
  closeEvent,
} from "@/lib/events/data";
import type { EtkinlikEvent, EventStatus } from "@/lib/events/types";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/components/ui/ToastProvider";
import KapanisRaporTab from "./tabs/KapanisRaporTab";
import type { EventClosureChecklist as ChecklistType } from "@/lib/events/types";

const STATUS_LABELS: Record<EventStatus, string> = {
  TASLAK: "Taslak",
  PLANLAMA: "Planlama",
  CANLI: "Canlı",
  KAPANIS_HAZIRLIGI: "Kapanış Hazırlığı",
  KAPANDI: "Kapandı",
};

const TABS = [
  { id: "ozet", labelKey: "m02_tab_ozet" },
  { id: "bilet_satis", labelKey: "m02_tab_bilet_satis" },
  { id: "operasyon", labelKey: "m02_tab_operasyon" },
  { id: "produksiyon", labelKey: "m02_tab_produksiyon" },
  { id: "ekip_vardiya", labelKey: "m02_tab_ekip_vardiya" },
  { id: "lojistik", labelKey: "m02_tab_lojistik" },
  { id: "finans", labelKey: "m02_tab_finans" },
  { id: "dokumanlar", labelKey: "m02_tab_dokumanlar" },
  { id: "risk_incident", labelKey: "m02_tab_risk_incident" },
  { id: "kapanis_rapor", labelKey: "m02_tab_kapanis_rapor" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function PlaceholderTab({ label }: { label: string }) {
  return (
    <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-8 backdrop-blur-sm">
      <p className="ui-text-muted text-center text-sm">{label} içeriği yakında eklenecek.</p>
    </div>
  );
}

export default function EventDetailClient() {
  const params = useParams();
  const eventId = params?.eventId as string | undefined;
  const { t } = useI18n();
  const toast = useToast();
  const { user } = useCurrentUser();
  const [event, setEvent] = useState<EtkinlikEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("ozet");
  const [openTasks, setOpenTasks] = useState(0);
  const [openIncidents, setOpenIncidents] = useState(0);
  const [financials, setFinancials] = useState<{
    total_revenue: number;
    total_expense: number;
    net_profit: number;
  }>({ total_revenue: 0, total_expense: 0, net_profit: 0 });
  const [checklist, setChecklist] = useState<ChecklistType | null>(null);
  const [closing, setClosing] = useState(false);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const [ev, incidents, fin, chk] = await Promise.all([
        fetchEvent(eventId),
        fetchEventIncidents(eventId),
        fetchEventFinancialsSummary(eventId),
        fetchEventClosureChecklist(eventId),
      ]);
      setEvent(ev ?? null);
      setOpenIncidents(incidents.filter((i) => i.status === "OPEN" || i.status === "IN_PROGRESS").length);
      setFinancials({
        total_revenue: fin.total_revenue,
        total_expense: fin.total_expense,
        net_profit: fin.net_profit,
      });
      setChecklist(chk);
      setOpenTasks(0);
    } catch {
      setEvent(null);
      setOpenIncidents(0);
      setFinancials({ total_revenue: 0, total_expense: 0, net_profit: 0 });
      setChecklist(null);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCloseEvent = useCallback(async () => {
    if (!eventId || !user?.id || !checklist?.all_passed) return;
    setClosing(true);
    try {
      const result = await closeEvent(eventId, user.id);
      if (result.success) {
        toast.success("Etkinlik kapatıldı.");
        load();
      } else {
        toast.error(result.error ?? "Kapanış başarısız.");
      }
    } catch {
      toast.error("Kapanış sırasında hata oluştu.");
    } finally {
      setClosing(false);
    }
  }, [eventId, user?.id, checklist?.all_passed, toast, load]);

  if (!eventId) {
    return (
      <div className="flex w-full flex-col gap-6">
        <p className="ui-text-muted text-center text-sm">Etkinlik bulunamadı.</p>
      </div>
    );
  }

  if (loading && !event) {
    return (
      <div className="flex w-full flex-col gap-6">
        <p className="ui-text-muted text-center text-sm">{t("common_loading")}</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex w-full flex-col gap-6">
        <p className="ui-text-muted text-center text-sm">Etkinlik bulunamadı.</p>
        <Link
          href="/m02/events"
          className="ui-text-muted text-sm underline hover:no-underline"
        >
          {t("m02_back_to_events")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="sticky top-0 z-10 ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 p-4 backdrop-blur-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Link
                href="/m02/events"
                className="ui-text-muted text-sm underline hover:no-underline"
              >
                ← {t("m02_back_to_events")}
              </Link>
            </div>
            <h1 className="ui-heading-page">{event.name}</h1>
            <p className="ui-text-muted text-sm">
              {event.date} {event.venue ? `· ${event.venue}` : ""}
            </p>
            <span
              className="inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: "var(--color-surface-elevated)",
                color: "var(--color-text)",
              }}
            >
              {STATUS_LABELS[event.status]}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-3 py-2">
            <span className="ui-text-muted block text-xs">{t("m02_kpi_open_tasks")}</span>
            <span className="font-medium">{openTasks}</span>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-3 py-2">
            <span className="ui-text-muted block text-xs">{t("m02_kpi_open_incidents")}</span>
            <span className="font-medium">{openIncidents}</span>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-3 py-2">
            <span className="ui-text-muted block text-xs">{t("m02_kpi_total_revenue")}</span>
            <span className="font-medium">
              ₺{financials.total_revenue.toLocaleString("tr-TR")}
            </span>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-3 py-2">
            <span className="ui-text-muted block text-xs">{t("m02_kpi_total_expense")}</span>
            <span className="font-medium">
              ₺{financials.total_expense.toLocaleString("tr-TR")}
            </span>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-3 py-2">
            <span className="ui-text-muted block text-xs">{t("m02_kpi_net_profit")}</span>
            <span className="font-medium">
              ₺{financials.net_profit.toLocaleString("tr-TR")}
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)]"
                  : "ui-text-muted hover:bg-[var(--color-surface)]/80"
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        {activeTab === "ozet" && (
          <PlaceholderTab label={t("m02_tab_ozet")} />
        )}
        {activeTab === "bilet_satis" && (
          <PlaceholderTab label={t("m02_tab_bilet_satis")} />
        )}
        {activeTab === "operasyon" && (
          <PlaceholderTab label={t("m02_tab_operasyon")} />
        )}
        {activeTab === "produksiyon" && (
          <PlaceholderTab label={t("m02_tab_produksiyon")} />
        )}
        {activeTab === "ekip_vardiya" && (
          <PlaceholderTab label={t("m02_tab_ekip_vardiya")} />
        )}
        {activeTab === "lojistik" && (
          <PlaceholderTab label={t("m02_tab_lojistik")} />
        )}
        {activeTab === "finans" && (
          <PlaceholderTab label={t("m02_tab_finans")} />
        )}
        {activeTab === "dokumanlar" && (
          <PlaceholderTab label={t("m02_tab_dokumanlar")} />
        )}
        {activeTab === "risk_incident" && (
          <PlaceholderTab label={t("m02_tab_risk_incident")} />
        )}
        {activeTab === "kapanis_rapor" && (
          <KapanisRaporTab
            eventId={eventId}
            event={event}
            checklist={checklist}
            onCloseEvent={handleCloseEvent}
            closing={closing}
            onRefresh={load}
          />
        )}
      </div>
    </div>
  );
}
