"use client";

const STATUS_CARDS = [
  { id: "rls", label: "RLS", value: "Aktif", desc: "Row Level Security" },
  { id: "audit", label: "Audit Logs", value: "Aktif", desc: "Kayıt tutma" },
  { id: "auth", label: "Auth", value: "Aktif", desc: "Kimlik doğrulama" },
  { id: "ratelimit", label: "Rate Limit", value: "Yakında", desc: "API limitleri" },
] as const;

export default function GenelTab() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATUS_CARDS.map((card) => (
          <div
            key={card.id}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/50 p-4"
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider ui-text-muted">
              {card.label}
            </h3>
            <p className="mt-2 text-sm font-medium text-[var(--color-text)]">
              {card.value}
            </p>
            <p className="mt-0.5 text-xs ui-text-muted">{card.desc}</p>
            <span
              className={`mt-2 inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                card.value === "Aktif"
                  ? "bg-emerald-500/20 text-emerald-200"
                  : "bg-amber-500/20 text-amber-200"
              }`}
            >
              {card.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
