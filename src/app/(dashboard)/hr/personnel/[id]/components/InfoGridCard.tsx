"use client";

import SectionCard from "./SectionCard";

export interface InfoRow {
  label: string;
  value: string;
}

type InfoGridCardProps = {
  title: string;
  rows: InfoRow[];
  columns?: 2 | 3 | 4;
  footer?: React.ReactNode;
  className?: string;
};

export default function InfoGridCard({
  title,
  rows,
  columns = 3,
  footer,
  className = "",
}: InfoGridCardProps) {
  const gridCols = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <SectionCard title={title} className={className}>
      <div className={`grid gap-x-6 gap-y-5 ${gridCols[columns]}`}>
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between"
          >
            <span className="text-xs font-medium uppercase tracking-wider ui-text-muted">
              {row.label}
            </span>
            <span className="text-sm font-medium text-[var(--color-text)]">{row.value || "—"}</span>
          </div>
        ))}
      </div>
      {footer ? (
        <div className="mt-5 border-t border-[var(--color-border)] pt-5">{footer}</div>
      ) : null}
    </SectionCard>
  );
}
