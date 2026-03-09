"use client";

export interface KpiItem {
  label: string;
  value: string;
}

type PersonnelKpiRowProps = {
  items: KpiItem[];
};

export default function PersonnelKpiRow({ items }: PersonnelKpiRowProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((kpi) => (
        <div
          key={kpi.label}
          className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 backdrop-blur-sm"
        >
          <p className="text-xs font-medium ui-text-muted">{kpi.label}</p>
          <p className="mt-1 text-xl font-bold text-[var(--color-text)]">{kpi.value}</p>
        </div>
      ))}
    </div>
  );
}
