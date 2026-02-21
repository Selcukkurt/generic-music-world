"use client";

import type { Rollback } from "./types";

type RollbackTabProps = {
  rollbacks: Rollback[];
  onCreateClick: () => void;
};

function formatDate(s: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("tr-TR");
  } catch {
    return s;
  }
}

export default function RollbackTab({
  rollbacks,
  onCreateClick,
}: RollbackTabProps) {
  if (rollbacks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--color-border)] p-8 text-center">
        <p className="ui-text-muted text-sm">Henüz rollback kaydı yok.</p>
        <button
          type="button"
          onClick={onCreateClick}
          className="ui-button-primary mt-4 rounded-lg px-4 py-2.5 text-sm font-semibold"
        >
          Rollback Kaydı Oluştur
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onCreateClick}
          className="ui-button-primary rounded-lg px-4 py-2.5 text-sm font-semibold"
        >
          + Rollback Kaydı
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Rollback ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Nereden (Deploy)
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Nereye (Deploy)
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Gerekçe
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Tarih
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {rollbacks.map((r) => (
              <tr
                key={r.id}
                className="transition hover:bg-[var(--color-surface-hover)]/50"
              >
                <td className="px-4 py-3.5 text-sm font-medium text-[var(--color-text)] sm:px-6">
                  {r.rollback_id}
                </td>
                <td className="px-4 py-3.5 text-sm ui-text-secondary sm:px-6">
                  {r.from_deploy_id}
                </td>
                <td className="px-4 py-3.5 text-sm ui-text-secondary sm:px-6">
                  {r.to_deploy_id}
                </td>
                <td className="px-4 py-3.5 text-sm ui-text-secondary sm:px-6">
                  {r.reason}
                </td>
                <td className="px-4 py-3.5 text-xs ui-text-muted sm:px-6">
                  {formatDate(r.executed_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
