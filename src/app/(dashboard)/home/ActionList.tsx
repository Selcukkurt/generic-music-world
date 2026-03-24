"use client";

import Link from "next/link";

type Priority = "high" | "medium" | "low";

type ActionItem = {
  id: string;
  title: string;
  module: string;
  date: string;
  type: "approval" | "task" | "action";
  priority: Priority;
};

const MOCK_ITEMS: ActionItem[] = [
  { id: "1", title: "M02 Etkinlik bütçe onayı", module: "Etkinlikler", date: "08.03.2026", type: "approval", priority: "high" },
  { id: "2", title: "Personel sicil güncellemesi", module: "M04 İK", date: "07.03.2026", type: "task", priority: "medium" },
  { id: "3", title: "Kadro atama değerlendirmesi", module: "M04 Kadro", date: "09.03.2026", type: "action", priority: "high" },
  { id: "4", title: "Finans transfer onayı", module: "M04 Finans", date: "10.03.2026", type: "approval", priority: "medium" },
  { id: "5", title: "KPI raporu gönderimi", module: "Raporlama", date: "06.03.2026", type: "action", priority: "low" },
];

const PRIORITY_BADGE: Record<Priority, string> = {
  high: "bg-red-500/20 text-red-400",
  medium: "bg-amber-500/20 text-amber-400",
  low: "bg-gray-500/20 text-gray-400",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  high: "Yüksek",
  medium: "Orta",
  low: "Düşük",
};

function ModuleIcon({ module }: { module: string }) {
  const m = module.toLowerCase();
  const isEvent = m.includes("etkinlik") || m.includes("m02");
  const isFinance = m.includes("finans") || m.includes("m03") || m.includes("m04 finans");
  const isPeople = m.includes("ik") || m.includes("kadro") || m.includes("personel") || m.includes("m04");
  const isReport = m.includes("rapor") || m.includes("kpi");
  const icon = isEvent ? "📅" : isFinance ? "💰" : isPeople ? "👤" : isReport ? "📊" : "📋";
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface2)] text-sm" aria-hidden>
      {icon}
    </span>
  );
}

export default function ActionList() {
  return (
    <section className="rounded-xl border-2 border-[var(--color-primary)]/30 bg-[var(--color-surface)]/80 p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">
        Benden Beklenenler
      </h2>
      <ul className="space-y-3">
        {MOCK_ITEMS.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-border)]/50 bg-[var(--color-bg)]/30 px-4 py-3 transition hover:border-[var(--color-border)]"
          >
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <ModuleIcon module={item.module} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-[var(--color-text)]">
                    {item.title}
                  </p>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_BADGE[item.priority]}`}>
                    {PRIORITY_LABEL[item.priority]}
                  </span>
                </div>
                <p className="mt-0.5 text-xs ui-text-muted">
                  {item.module} · {item.date}
                </p>
              </div>
            </div>
            <Link
              href="/home"
              className="shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] transition hover:bg-[var(--color-surface-hover)]"
            >
              Görüntüle
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
