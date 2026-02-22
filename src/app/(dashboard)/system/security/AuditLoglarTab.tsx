"use client";

import Link from "next/link";

const MOCK_EVENTS = [
  { id: 1, action: "LOGIN_SUCCESS", user: "info@genericmusic.net", time: "2026-02-21 14:32" },
  { id: 2, action: "RELEASE_CREATED", user: "system_owner", time: "2026-02-21 14:28" },
  { id: 3, action: "RELEASE_STATUS_CHANGED", user: "system_owner", time: "2026-02-21 14:15" },
  { id: 4, action: "LOGIN_SUCCESS", user: "selcuk@genericmusic.net", time: "2026-02-21 13:45" },
  { id: 5, action: "SYSTEM_SETTINGS_UPDATED", user: "system_owner", time: "2026-02-21 12:00" },
] as const;

export default function AuditLoglarTab() {
  return (
    <div className="space-y-6">
      <p className="text-sm ui-text-muted">
        Son güvenlik olayları. Tam liste için Log Kayıtları sayfasına gidin.
      </p>
      <div className="rounded-lg border border-[var(--color-border)]">
        <table className="w-full min-w-[400px]">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Aksiyon
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Kullanıcı
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Zaman
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {MOCK_EVENTS.map((e) => (
              <tr
                key={e.id}
                className="transition hover:bg-[var(--color-surface-hover)]/50"
              >
                <td className="px-4 py-3.5 text-sm font-medium text-[var(--color-text)] sm:px-6">
                  {e.action}
                </td>
                <td className="px-4 py-3.5 text-sm ui-text-secondary sm:px-6">
                  {e.user}
                </td>
                <td className="px-4 py-3.5 text-xs ui-text-muted sm:px-6">
                  {e.time}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <Link
          href="/audit-log"
          className="ui-button-primary inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold"
        >
          Log Kayıtları sayfasına git
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
