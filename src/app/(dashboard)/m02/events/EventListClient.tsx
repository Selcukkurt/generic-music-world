"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/shell/PageHeader";
import { useI18n } from "@/i18n/LocaleProvider";
import { fetchEvents } from "@/lib/events/data";
import type { EtkinlikEvent, EventStatus } from "@/lib/events/types";

const STATUS_LABELS: Record<EventStatus, string> = {
  TASLAK: "Taslak",
  PLANLAMA: "Planlama",
  CANLI: "Canlı",
  KAPANIS_HAZIRLIGI: "Kapanış Hazırlığı",
  KAPANDI: "Kapandı",
};

export default function EventListClient() {
  const { t } = useI18n();
  const [events, setEvents] = useState<EtkinlikEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const list = await fetchEvents();
        if (!cancelled) setEvents(list);
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title={t("m02_events_title")}
        subtitle={t("m02_events_subtitle")}
      />
      <section className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-6 backdrop-blur-sm">
        {loading ? (
          <p className="ui-text-muted text-center text-sm">{t("common_loading")}</p>
        ) : events.length === 0 ? (
          <p className="ui-text-muted text-center text-sm">{t("m02_event_list_empty")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {events.map((ev) => (
              <li key={ev.id}>
                <Link
                  href={`/m02/events/${ev.id}`}
                  className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-4 transition-colors hover:bg-[var(--color-surface)]/80"
                >
                  <div>
                    <span className="font-medium">{ev.name}</span>
                    <span className="ui-text-muted ml-2 text-sm">
                      {ev.date} {ev.venue ? `· ${ev.venue}` : ""}
                    </span>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: "var(--color-surface-elevated)",
                      color: "var(--color-text)",
                    }}
                  >
                    {STATUS_LABELS[ev.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
