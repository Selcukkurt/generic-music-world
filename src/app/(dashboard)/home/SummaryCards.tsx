"use client";

type SummaryCardsProps = {
  pendingApprovals: number;
  unreadNotifications: number;
  openTasks: number;
  todayItems: number;
};

const CARD_STYLE =
  "ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 backdrop-blur-sm transition hover:border-[var(--color-border)]/80";

export default function SummaryCards({
  pendingApprovals,
  unreadNotifications,
  openTasks,
  todayItems,
}: SummaryCardsProps) {
  const cards = [
    { label: "Bekleyen Onaylar", count: pendingApprovals, key: "approvals" },
    { label: "Bildirimler", count: unreadNotifications, key: "notifications" },
    { label: "Açık Görevler", count: openTasks, key: "tasks" },
    { label: "Bugünkü Öğeler", count: todayItems, key: "today" },
  ];

  return (
    <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map(({ label, count, key }) => (
        <div key={key} className={CARD_STYLE}>
          <p className="text-xs font-medium uppercase tracking-wider ui-text-muted">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold text-[var(--color-text)]">
            {count}
          </p>
        </div>
      ))}
    </section>
  );
}
