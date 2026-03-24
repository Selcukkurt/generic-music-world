"use client";

import Link from "next/link";

type NotificationItem = {
  id: string;
  title: string;
  date: string;
  read: boolean;
};

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  { id: "1", title: "Yeni bildirim: Etkinlik onayı tamamlandı", date: "08.03.2026 14:32", read: false },
  { id: "2", title: "Personel ataması güncellendi", date: "08.03.2026 11:15", read: false },
  { id: "3", title: "Sistem bakım bildirimi", date: "07.03.2026 09:00", read: true },
  { id: "4", title: "Bütçe raporu hazır", date: "06.03.2026 16:45", read: true },
  { id: "5", title: "Yeni kullanıcı davet edildi", date: "06.03.2026 10:20", read: true },
];

type NotificationListProps = {
  maxItems?: number;
};

export default function NotificationList({ maxItems = 5 }: NotificationListProps) {
  const items = MOCK_NOTIFICATIONS.slice(0, maxItems);

  return (
    <section className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-5 backdrop-blur-sm">
      <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">
        Son Bildirimler
      </h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition hover:border-[var(--color-border)] ${
              item.read
                ? "border-[var(--color-border)]/30 bg-transparent"
                : "border-[var(--color-border)]/50 bg-[var(--color-bg)]/30"
            }`}
          >
            <div className="min-w-0 flex-1">
              <p
                className={`truncate text-sm ${
                  item.read ? "ui-text-muted" : "font-medium text-[var(--color-text)]"
                }`}
              >
                {item.title}
              </p>
              <p className="text-[10px] ui-text-muted">{item.date}</p>
            </div>
            <Link
              href="/notifications"
              className="shrink-0 text-xs font-medium text-[var(--color-primary)] hover:underline"
            >
              Detay
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
