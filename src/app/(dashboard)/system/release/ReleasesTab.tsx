"use client";

import type { Release } from "./types";

type ReleasesTabProps = {
  releases: Release[];
  onStatusChange: (id: string, status: string) => void;
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

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Taslak",
  READY: "Hazır",
  DEPLOYED: "Dağıtıldı",
  ROLLED_BACK: "Geri Alındı",
};

export default function ReleasesTab({
  releases,
  onStatusChange,
  onCreateClick,
}: ReleasesTabProps) {
  if (releases.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--color-border)] p-8 text-center">
        <p className="ui-text-muted text-sm">Henüz release kaydı yok.</p>
        <button
          type="button"
          onClick={onCreateClick}
          className="ui-button-primary mt-4 rounded-lg px-4 py-2.5 text-sm font-semibold"
        >
          Yeni Release Oluştur
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
          + Yeni Release
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Release ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Versiyon / Tag
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Başlık
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Durum
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Oluşturulma
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Onay
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                İşlem
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {releases.map((r) => (
              <tr
                key={r.id}
                className="transition hover:bg-[var(--color-surface-hover)]/50"
              >
                <td className="px-4 py-3.5 text-sm font-medium text-[var(--color-text)] sm:px-6">
                  {r.release_id}
                </td>
                <td className="px-4 py-3.5 text-sm ui-text-secondary sm:px-6">
                  {r.version_tag}
                </td>
                <td className="px-4 py-3.5 text-sm ui-text-secondary sm:px-6">
                  {r.title}
                </td>
                <td className="px-4 py-3.5 sm:px-6">
                  <span
                    className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                      r.status === "DEPLOYED"
                        ? "bg-emerald-500/20 text-emerald-200"
                        : r.status === "READY"
                          ? "bg-amber-500/20 text-amber-200"
                          : r.status === "ROLLED_BACK"
                            ? "bg-red-500/20 text-red-200"
                            : "bg-[var(--color-surface2)] ui-text-muted"
                    }`}
                  >
                    {STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-xs ui-text-muted sm:px-6">
                  {formatDate(r.created_at)}
                </td>
                <td className="px-4 py-3.5 text-xs ui-text-muted sm:px-6">
                  {formatDate(r.approved_at)}
                </td>
                <td className="px-4 py-3.5 text-right sm:px-6">
                  {r.status === "DRAFT" && (
                    <button
                      type="button"
                      onClick={() => onStatusChange(r.id, "READY")}
                      className="rounded border border-[var(--color-border)] bg-[var(--color-surface2)] px-2 py-1 text-xs font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
                    >
                      Hazırla
                    </button>
                  )}
                  {r.status === "READY" && (
                    <button
                      type="button"
                      onClick={() => onStatusChange(r.id, "DEPLOYED")}
                      className="rounded border border-[var(--color-border)] bg-[var(--color-surface2)] px-2 py-1 text-xs font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
                    >
                      Dağıtıldı
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
