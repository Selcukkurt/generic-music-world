"use client";

import Link from "next/link";

type ApprovalItem = {
  id: string;
  title: string;
  date: string;
};

const MOCK_APPROVALS: ApprovalItem[] = [
  { id: "1", title: "M02 Bütçe onayı", date: "08.03.2026" },
  { id: "2", title: "Personel izin talebi", date: "07.03.2026" },
  { id: "3", title: "Finans transfer", date: "09.03.2026" },
  { id: "4", title: "Kadro değişikliği", date: "10.03.2026" },
  { id: "5", title: "Hak ediş onayı", date: "06.03.2026" },
];

type ApprovalListProps = {
  maxItems?: number;
};

export default function ApprovalList({ maxItems = 5 }: ApprovalListProps) {
  const items = MOCK_APPROVALS.slice(0, maxItems);

  return (
    <section className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-5 backdrop-blur-sm">
      <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">
        Bekleyen Onaylar
      </h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)]/50 bg-[var(--color-bg)]/30 px-3 py-2 transition hover:border-[var(--color-border)]"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-[var(--color-text)]">
                {item.title}
              </p>
              <p className="text-[10px] ui-text-muted">{item.date}</p>
            </div>
            <Link
              href="/home"
              className="shrink-0 text-xs font-medium text-[var(--color-primary)] hover:underline"
            >
              Görüntüle
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
