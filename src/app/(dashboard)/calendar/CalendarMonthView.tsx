"use client";

import { useMemo } from "react";
import type { CalendarEvent } from "@/lib/calendar/types";
import { statusPillClass, toLocalDateKey } from "@/lib/calendar/types";
import { getMonthGridRange } from "@/lib/calendar/data";

const TZ = "Europe/Istanbul";
const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

type DayCell = {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
  events: CalendarEvent[];
};

function buildGrid(year: number, month: number): DayCell[] {
  const { from } = getMonthGridRange(year, month);
  const start = new Date(from);
  const cells: DayCell[] = [];
  const targetMonth = month;

  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getTime());
    d.setDate(start.getDate() + i);
    const dateKey = d.toLocaleDateString("en-CA", { timeZone: TZ });
    cells.push({
      date: d,
      dateKey,
      isCurrentMonth: d.getMonth() === targetMonth,
      events: [],
    });
  }
  return cells;
}

function groupEventsByDay(events: CalendarEvent[], cells: DayCell[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const cell of cells) {
    map.set(cell.dateKey, []);
  }
  for (const ev of events) {
    const key = toLocalDateKey(ev.start_at, TZ);
    if (map.has(key)) {
      map.get(key)!.push(ev);
    }
  }
  return map;
}

type Props = {
  year: number;
  month: number;
  events: CalendarEvent[];
  loading: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onSelectEvent: (ev: CalendarEvent) => void;
  onDayClick?: (date: Date) => void;
  selectedId?: string | null;
};

export default function CalendarMonthView({
  year,
  month,
  events,
  loading,
  onPrevMonth,
  onNextMonth,
  onToday,
  onSelectEvent,
  onDayClick,
  selectedId,
}: Props) {
  const cells = useMemo(() => buildGrid(year, month), [year, month]);
  const eventsByDay = useMemo(() => groupEventsByDay(events, cells), [events, cells]);

  const totalEvents = events.length;
  const isEmpty = !loading && totalEvents === 0;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-4 py-3">
        <h2 className="text-base font-semibold text-[var(--color-text)]">
          {MONTH_NAMES[month]} {year}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrevMonth}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] p-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
            aria-label="Önceki ay"
          >
            ←
          </button>
          <button
            type="button"
            onClick={onToday}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-3 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
          >
            Bugün
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] p-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
            aria-label="Sonraki ay"
          >
            →
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center">
          <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-surface2)]" />
        </div>
      ) : (
        <div className="relative overflow-x-auto">
          <div className="min-w-[480px]">
            <div className="grid grid-cols-7 border-b border-[var(--color-border)]">
              {WEEKDAYS.map((wd) => (
                <div
                  key={wd}
                  className="border-r border-[var(--color-border)] px-1 py-2 text-center text-xs font-medium ui-text-muted last:border-r-0"
                >
                  {wd}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((cell) => {
                const dayEvents = eventsByDay.get(cell.dateKey) ?? [];
                const visible = dayEvents.slice(0, 3);
                const extra = dayEvents.length - 3;

                return (
                  <div
                    key={cell.dateKey}
                    role="button"
                    tabIndex={0}
                    onClick={() => onDayClick?.(cell.date)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onDayClick?.(cell.date);
                      }
                    }}
                    className={`min-h-[80px] border-b border-r border-[var(--color-border)] p-1 last:border-r-0 ${
                      cell.isCurrentMonth ? "bg-[var(--color-surface)]" : "bg-[var(--color-bg)]/50"
                    } cursor-pointer transition hover:bg-[var(--color-surface-hover)]/50`}
                  >
                    <span
                      className={`inline-block text-xs font-medium ${
                        cell.isCurrentMonth ? "text-[var(--color-text)]" : "ui-text-muted"
                      }`}
                    >
                      {cell.date.getDate()}
                    </span>
                    <div className="mt-1 flex flex-col gap-0.5">
                      {visible.map((ev) => (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEvent(ev);
                          }}
                          className={`truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium transition hover:opacity-90 ${statusPillClass(ev.status)} ${
                            selectedId === ev.id ? "ring-1 ring-[var(--brand-yellow)]" : ""
                          }`}
                          title={ev.title}
                        >
                          {ev.title}
                        </button>
                      ))}
                      {extra > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] ui-text-muted">
                          +{extra}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {isEmpty && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="text-sm ui-text-muted">Bu ay için kayıt yok.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
