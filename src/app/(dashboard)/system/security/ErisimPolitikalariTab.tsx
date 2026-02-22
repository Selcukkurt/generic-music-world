"use client";

const RLS_TABLES = [
  { name: "profiles", label: "Profiller" },
  { name: "roles", label: "Roller" },
  { name: "user_roles", label: "Kullanıcı Rolleri" },
  { name: "releases", label: "Release'ler" },
  { name: "deployments", label: "Deployments" },
  { name: "rollbacks", label: "Rollback'ler" },
  { name: "system_settings", label: "Sistem Ayarları" },
  { name: "audit_log", label: "Audit Log" },
] as const;

export default function ErisimPolitikalariTab() {
  return (
    <div className="space-y-6">
      <p className="text-sm ui-text-muted">
        Kritik tablolar için RLS (Row Level Security) durumu. V1: statik gösterim.
      </p>
      <div className="rounded-lg border border-[var(--color-border)]">
        <table className="w-full min-w-[320px]">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Tablo
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                RLS Durumu
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {RLS_TABLES.map((t) => (
              <tr
                key={t.name}
                className="transition hover:bg-[var(--color-surface-hover)]/50"
              >
                <td className="px-4 py-3.5 text-sm font-medium text-[var(--color-text)] sm:px-6">
                  {t.label}
                </td>
                <td className="px-4 py-3.5 sm:px-6">
                  <span className="inline-flex rounded px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-200">
                    RLS: Aktif
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
