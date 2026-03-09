"use client";

import type { RecentActionItem } from "../../config/sidebar";

type RecentActionsSectionProps = {
  items: RecentActionItem[];
};

export default function RecentActionsSection({ items }: RecentActionsSectionProps) {
  if (items.length === 0) {
    return (
      <p className="py-2 text-sm ui-text-muted">Son işlem bulunmuyor.</p>
    );
  }

  return (
    <ul className="space-y-2" role="list">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/20 px-3 py-2.5"
        >
          <p className="text-sm font-medium text-[var(--color-text)]">{item.title}</p>
          <p className="mt-0.5 text-xs ui-text-muted">{item.meta}</p>
          <p className="mt-1 text-xs ui-text-muted">{item.time}</p>
        </li>
      ))}
    </ul>
  );
}
