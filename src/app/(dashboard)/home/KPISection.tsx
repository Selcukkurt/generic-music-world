"use client";

type KPICard = {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "flat";
  pctChange?: string;
};

const MOCK_KPIS: KPICard[] = [
  { id: "1", label: "Bu Ay Etkinlik", value: 12, unit: "adet", trend: "up", pctChange: "+15%" },
  { id: "2", label: "Ortalama Doluluk", value: "78%", trend: "flat", pctChange: "0%" },
  { id: "3", label: "Bütçe Kullanımı", value: "62%", trend: "down", pctChange: "-8%" },
  { id: "4", label: "Aktif Personel", value: 48, unit: "kişi", trend: "up", pctChange: "+5%" },
];

export default function KPISection() {
  return (
    <section className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-[var(--color-text)]">
          KPI Alanı
        </h2>
        <button
          type="button"
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] transition hover:bg-[var(--color-surface-hover)]"
        >
          + KPI ekle
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {MOCK_KPIS.map((kpi) => (
          <div
            key={kpi.id}
            className="rounded-lg border border-[var(--color-border)]/50 bg-[var(--color-bg)]/30 p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wider ui-text-muted">
              {kpi.label}
            </p>
            <p className="mt-2 text-xl font-semibold text-[var(--color-text)]">
              {kpi.value}
              {kpi.unit && (
                <span className="ml-1 text-sm font-normal ui-text-muted">
                  {kpi.unit}
                </span>
              )}
            </p>
            {(kpi.trend || kpi.pctChange) && (
              <div
                className={`mt-1 flex items-center gap-1 text-[10px] font-medium ${
                  kpi.trend === "up"
                    ? "text-emerald-400"
                    : kpi.trend === "down"
                      ? "text-red-400"
                      : "ui-text-muted"
                }`}
              >
                <span>{kpi.trend === "up" ? "↑" : kpi.trend === "down" ? "↓" : "→"}</span>
                {kpi.pctChange && <span>{kpi.pctChange}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
