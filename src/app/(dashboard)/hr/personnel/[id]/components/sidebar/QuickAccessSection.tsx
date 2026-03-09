"use client";

import Link from "next/link";
import type { QuickAccessItem } from "../../config/sidebar";

type QuickAccessSectionProps = {
  items: QuickAccessItem[];
};

export default function QuickAccessSection({ items }: QuickAccessSectionProps) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        const baseClass =
          "rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 px-3 py-2.5 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface2)]/50";

        if (item.href) {
          return (
            <Link key={item.id} href={item.href} className={baseClass}>
              {item.label}
            </Link>
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            className={`w-full text-left ${baseClass}`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
