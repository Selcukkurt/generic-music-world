"use client";

import type { OverviewData } from "./types";

type GenelBakisTabProps = {
  data: OverviewData | null;
  onNewRelease: () => void;
  onNewDeploy: () => void;
  onNewRollback: () => void;
};

function formatDate(s: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("tr-TR");
  } catch {
    return s;
  }
}

export default function GenelBakisTab({
  data,
  onNewRelease,
  onNewDeploy,
  onNewRollback,
}: GenelBakisTabProps) {
  const prod = data?.currentProduction;
  const lastDeploy = data?.lastDeployment;
  const lastRelease = data?.lastRelease;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/50 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider ui-text-muted">
            Mevcut Production
          </h3>
          {prod ? (
            <div className="mt-2 space-y-1">
              <p className="text-sm font-medium text-[var(--color-text)]">
                {prod.tag || prod.commit_sha || "—"}
              </p>
              <p className="text-xs ui-text-muted">
                {prod.release?.title ?? prod.release?.version_tag ?? "—"}
              </p>
              <p className="text-xs ui-text-muted">
                {formatDate(prod.deployed_at)}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm ui-text-muted">Henüz production deploy yok.</p>
          )}
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/50 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider ui-text-muted">
            Son Deployment
          </h3>
          {lastDeploy ? (
            <div className="mt-2 space-y-1">
              <p className="text-sm font-medium text-[var(--color-text)]">
                {lastDeploy.deploy_id}
              </p>
              <p className="text-xs ui-text-muted">
                {lastDeploy.environment} · {lastDeploy.status}
              </p>
              <p className="text-xs ui-text-muted">
                {formatDate(lastDeploy.finished_at ?? lastDeploy.started_at)}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm ui-text-muted">Henüz deploy kaydı yok.</p>
          )}
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/50 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider ui-text-muted">
            Son Release
          </h3>
          {lastRelease ? (
            <div className="mt-2 space-y-1">
              <p className="text-sm font-medium text-[var(--color-text)]">
                {lastRelease.release_id}
              </p>
              <p className="text-xs ui-text-muted">
                {lastRelease.title} · {lastRelease.status}
              </p>
              <p className="text-xs ui-text-muted">
                {formatDate(lastRelease.created_at)}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm ui-text-muted">Henüz release yok.</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onNewRelease}
          className="ui-button-primary rounded-lg px-4 py-2.5 text-sm font-semibold"
        >
          Yeni Release Oluştur
        </button>
        <button
          type="button"
          onClick={onNewDeploy}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2.5 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
        >
          Yeni Deploy Kaydı
        </button>
        <button
          type="button"
          onClick={onNewRollback}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2.5 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
        >
          Rollback Kaydı
        </button>
      </div>
    </div>
  );
}
