"use client";

import type { DeploymentWithRelease } from "./types";

type DeployGecmisiTabProps = {
  deployments: DeploymentWithRelease[];
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

const ENV_LABELS: Record<string, string> = {
  LOCAL: "Local",
  STAGING: "Staging",
  PRODUCTION: "Production",
};

const STATUS_LABELS: Record<string, string> = {
  SUCCESS: "Başarılı",
  FAILED: "Başarısız",
  IN_PROGRESS: "Devam Ediyor",
};

export default function DeployGecmisiTab({
  deployments,
  onCreateClick,
}: DeployGecmisiTabProps) {
  if (deployments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--color-border)] p-8 text-center">
        <p className="ui-text-muted text-sm">Henüz deploy kaydı yok.</p>
        <button
          type="button"
          onClick={onCreateClick}
          className="ui-button-primary mt-4 rounded-lg px-4 py-2.5 text-sm font-semibold"
        >
          Yeni Deploy Kaydı
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
          + Yeni Deploy
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Deploy ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Release
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Ortam
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Durum
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Commit / Tag
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Başlangıç
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Bitiş
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {deployments.map((d) => (
              <tr
                key={d.id}
                className="transition hover:bg-[var(--color-surface-hover)]/50"
              >
                <td className="px-4 py-3.5 text-sm font-medium text-[var(--color-text)] sm:px-6">
                  {d.deploy_id}
                </td>
                <td className="px-4 py-3.5 text-sm ui-text-secondary sm:px-6">
                  {d.release?.title ?? d.release?.version_tag ?? d.release_id}
                </td>
                <td className="px-4 py-3.5 text-sm ui-text-secondary sm:px-6">
                  {ENV_LABELS[d.environment] ?? d.environment}
                </td>
                <td className="px-4 py-3.5 sm:px-6">
                  <span
                    className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                      d.status === "SUCCESS"
                        ? "bg-emerald-500/20 text-emerald-200"
                        : d.status === "FAILED"
                          ? "bg-red-500/20 text-red-200"
                          : "bg-amber-500/20 text-amber-200"
                    }`}
                  >
                    {STATUS_LABELS[d.status] ?? d.status}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-xs ui-text-muted sm:px-6">
                  {d.tag || d.commit_sha || "—"}
                </td>
                <td className="px-4 py-3.5 text-xs ui-text-muted sm:px-6">
                  {formatDate(d.started_at)}
                </td>
                <td className="px-4 py-3.5 text-xs ui-text-muted sm:px-6">
                  {formatDate(d.finished_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
