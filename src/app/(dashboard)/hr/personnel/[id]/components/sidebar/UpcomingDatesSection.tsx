"use client";

import type { UpcomingDateItem } from "../../config/sidebar";

type UpcomingDatesSectionProps = {
  items: UpcomingDateItem[];
};

function formatDaysRemaining(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "Bugün";
  if (days === 1) return "Yarın";
  if (days > 0 && days <= 7) return `${days} gün`;
  if (days > 7 && days <= 30) return `${Math.ceil(days / 7)} hafta`;
  return `${days} gün`;
}

export default function UpcomingDatesSection({ items }: UpcomingDatesSectionProps) {
  if (items.length === 0) {
    return (
      <p className="py-2 text-sm ui-text-muted">Yaklaşan tarih bulunmuyor.</p>
    );
  }

  return (
    <ul className="space-y-2" role="list">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-col gap-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 px-3 py-2.5"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-[var(--color-text)]">{item.label}</span>
            <span className="shrink-0 text-xs ui-text-muted">
              {formatDaysRemaining(item.daysRemaining)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs ui-text-muted">
            <span>{item.type}</span>
            <span>·</span>
            <span>{item.date}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
