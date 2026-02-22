"use client";

import type { Task } from "@/lib/tasks/types";
import { priorityBadgeClass } from "@/lib/tasks/types";

const MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

type Props = {
  tasks: Task[];
  loading: boolean;
  monthOffset: number;
  onMonthChange: (delta: number) => void;
  onSelectTask: (task: Task) => void;
  selectedId?: string | null;
};

function groupByDay(tasks: Task[]): Map<string, Task[]> {
  const map = new Map<string, Task[]>();
  for (const t of tasks) {
    if (!t.completed_at) continue;
    const key = new Date(t.completed_at).toLocaleDateString("en-CA");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime());
  }
  return map;
}

export default function MonthView({ tasks, loading, monthOffset, onMonthChange, onSelectTask, selectedId }: Props) {
  const d = new Date();
  d.setMonth(d.getMonth() + monthOffset);
  const year = d.getFullYear();
  const adjMonth = d.getMonth();
  const monthName = MONTH_NAMES[adjMonth];

  const byDay = groupByDay(tasks);
  const days = Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b));

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-surface2)]" />
      </div>
    );
  }

  return (
    <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <h2 className="font-semibold text-[var(--color-text)]">
          {monthName} {year}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onMonthChange(-1)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] p-2 text-sm ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(0)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-3 py-2 text-sm ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
          >
            Bugün
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(1)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] p-2 text-sm ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
          >
            →
          </button>
        </div>
      </div>
      <div className="p-4">
        {days.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center py-16">
            <p className="text-sm font-medium text-[var(--color-text)]">Bu ay tamamlanan görev yok.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {days.map(([dateKey, dayTasks]) => (
              <div key={dateKey}>
                <h3 className="mb-2 text-sm font-medium ui-text-muted">
                  {new Date(dateKey + "T12:00:00").toLocaleDateString("tr-TR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </h3>
                <div className="space-y-2">
                  {dayTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => onSelectTask(task)}
                      className={`flex w-full items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left transition hover:bg-[var(--color-surface-hover)]/50 ${
                        selectedId === task.id ? "ring-2 ring-[var(--brand-yellow)]" : ""
                      }`}
                    >
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${priorityBadgeClass(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className="flex-1 font-medium text-[var(--color-text)]">{task.title}</span>
                      <span className="text-xs ui-text-muted">
                        {task.completed_at
                          ? new Date(task.completed_at).toLocaleTimeString("tr-TR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
