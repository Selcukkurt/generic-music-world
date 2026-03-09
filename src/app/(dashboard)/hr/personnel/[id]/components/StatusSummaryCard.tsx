"use client";

import SectionCard from "./SectionCard";

export type StatusType = "ok" | "warning" | "pending" | "none";

export interface StatusItem {
  label: string;
  status: StatusType;
}

const STATUS_STYLES: Record<StatusType, string> = {
  ok: "bg-emerald-500/20 text-emerald-200",
  warning: "bg-amber-500/20 text-amber-200",
  pending: "bg-blue-500/20 text-blue-200",
  none: "bg-[var(--color-surface2)] ui-text-muted",
};

const STATUS_LABELS: Record<StatusType, string> = {
  ok: "Onaylı",
  warning: "Beklemede",
  pending: "İnceleniyor",
  none: "—",
};

type StatusSummaryCardProps = {
  title: string;
  items: StatusItem[];
  columns?: 2 | 3 | 4;
  className?: string;
};

export default function StatusSummaryCard({
  title,
  items,
  columns = 4,
  className = "",
}: StatusSummaryCardProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
  };

  return (
    <SectionCard title={title} className={className}>
      <div className={`grid gap-4 ${gridCols[columns]}`}>
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/20 px-4 py-2.5"
          >
            <span className="text-xs font-medium ui-text-muted">{item.label}</span>
            <span
              className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[item.status]}`}
            >
              {STATUS_LABELS[item.status]}
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
