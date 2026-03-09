"use client";

import type { CriticalAlertItem, AlertLevel } from "../../config/sidebar";

const ALERT_STYLES: Record<AlertLevel, string> = {
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  danger: "border-red-500/40 bg-red-500/10 text-red-200",
  info: "border-blue-500/40 bg-blue-500/10 text-blue-200",
};

type CriticalAlertsSectionProps = {
  items: CriticalAlertItem[];
};

export default function CriticalAlertsSection({ items }: CriticalAlertsSectionProps) {
  if (items.length === 0) {
    return (
      <p className="py-2 text-sm ui-text-muted">Kritik uyarı bulunmuyor.</p>
    );
  }

  return (
    <ul className="space-y-2" role="list">
      {items.map((item) => (
        <li
          key={item.id}
          className={`rounded-lg border px-3 py-2.5 text-sm ${ALERT_STYLES[item.level]}`}
        >
          <p className="font-medium">{item.message}</p>
          {item.meta ? (
            <p className="mt-0.5 text-xs opacity-90">{item.meta}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
