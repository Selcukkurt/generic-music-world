"use client";

type Alert = {
  id: string;
  title: string;
  severity: "high" | "medium";
};

const MOCK_ALERTS: Alert[] = [
  { id: "1", title: "M02 bütçe onayı 24 saat içinde yanıt bekliyor", severity: "high" },
  { id: "2", title: "Finans transfer talebi beklemede", severity: "high" },
  { id: "3", title: "Personel sicil güncellemesi eksik", severity: "medium" },
];

export default function KritikUyarilar() {
  const items = MOCK_ALERTS.slice(0, 3);

  return (
    <section className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-5 backdrop-blur-sm">
      <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">
        Kritik Uyarılar
      </h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
              item.severity === "high"
                ? "border-red-500/30 bg-red-500/10"
                : "border-amber-500/30 bg-amber-500/10"
            }`}
          >
            <span
              className={`mt-0.5 size-2 shrink-0 rounded-full ${
                item.severity === "high" ? "bg-red-400" : "bg-amber-400"
              }`}
            />
            <span className="text-[var(--color-text)]">{item.title}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
