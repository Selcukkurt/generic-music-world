"use client";

import { useState, useCallback, useEffect } from "react";
import PageHeader from "@/components/shell/PageHeader";
import { useToast } from "@/components/ui/ToastProvider";
import { versionFetch } from "@/lib/version/api-client";
import type { OverviewData, Release, Deployment, Rollback } from "./types";
import GenelBakisTab from "./GenelBakisTab";
import ReleasesTab from "./ReleasesTab";
import DeployGecmisiTab from "./DeployGecmisiTab";
import RollbackTab from "./RollbackTab";
import ReleaseCreateModal from "./ReleaseCreateModal";
import DeployCreateModal from "./DeployCreateModal";
import RollbackCreateModal from "./RollbackCreateModal";

const TABS = [
  { id: "genel", label: "Genel Bakış" },
  { id: "releases", label: "Release'ler" },
  { id: "deploys", label: "Deploy Geçmişi" },
  { id: "rollback", label: "Rollback" },
] as const;

export default function SystemReleasePage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("genel");
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [rollbacks, setRollbacks] = useState<Rollback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [releaseModalOpen, setReleaseModalOpen] = useState(false);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [rollbackModalOpen, setRollbackModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [overviewRes, releasesRes, deploymentsRes, rollbacksRes] = await Promise.all([
        versionFetch<OverviewData>("/overview"),
        versionFetch<Release[]>("/releases"),
        versionFetch<Deployment[]>("/deployments"),
        versionFetch<Rollback[]>("/rollbacks"),
      ]);
      setOverview(overviewRes);
      setReleases(overviewRes.releases ?? releasesRes ?? []);
      setDeployments(overviewRes.deployments ?? deploymentsRes ?? []);
      setRollbacks(rollbacksRes ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Veriler yüklenemedi.";
      setError(msg);
      toast.error("Yükleme hatası", msg);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateRelease = useCallback(
    async (data: { title: string; summary: string; version_tag: string }) => {
      await versionFetch("/releases", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("Release oluşturuldu.");
      loadData();
    },
    [loadData, toast]
  );

  const handleStatusChange = useCallback(
    async (id: string, status: string) => {
      const msg =
        status === "READY"
          ? "Release hazır durumuna alınacak. Onaylıyor musunuz?"
          : "Release dağıtıldı olarak işaretlenecek. Onaylıyor musunuz?";
      if (!window.confirm(msg)) return;
      try {
        await versionFetch(`/releases/${id}`, {
          method: "PUT",
          body: JSON.stringify({ status }),
        });
        toast.success("Durum güncellendi.");
        loadData();
      } catch (err) {
        toast.error("Hata", err instanceof Error ? err.message : "Güncelleme başarısız.");
      }
    },
    [loadData, toast]
  );

  const handleCreateDeploy = useCallback(
    async (data: {
      release_id: string;
      environment: string;
      commit_sha: string;
      tag: string;
      status: string;
      notes: string;
    }) => {
      await versionFetch("/deployments", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("Deploy kaydı oluşturuldu.");
      loadData();
    },
    [loadData, toast]
  );

  const handleCreateRollback = useCallback(
    async (data: {
      from_deploy_id: string;
      to_deploy_id: string;
      reason: string;
    }) => {
      await versionFetch("/rollbacks", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("Rollback kaydı oluşturuldu.");
      loadData();
    },
    [loadData, toast]
  );

  if (isLoading && !overview) {
    return (
      <div className="flex w-full flex-col gap-6">
        <PageHeader
          title="Sürüm Yönetimi"
          subtitle="Release ve deployment yönetimi."
        />
        <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 backdrop-blur-sm">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded bg-[var(--color-surface2)]" />
            <div className="h-4 w-full rounded bg-[var(--color-surface2)]" />
            <div className="h-4 w-3/4 rounded bg-[var(--color-surface2)]" />
            <div className="h-4 w-1/2 rounded bg-[var(--color-surface2)]" />
            <div className="mt-6 flex gap-3">
              <div className="h-10 w-24 rounded bg-[var(--color-surface2)]" />
              <div className="h-10 w-32 rounded bg-[var(--color-surface2)]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="flex w-full flex-col gap-6">
        <PageHeader
          title="Sürüm Yönetimi"
          subtitle="Release ve deployment yönetimi."
        />
        <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 backdrop-blur-sm">
          <p className="ui-text-muted text-center text-sm">{error}</p>
          <p className="ui-text-muted mt-2 text-center text-xs">
            Supabase yapılandırmasını ve API anahtarlarını kontrol edin.
          </p>
          <button
            type="button"
            onClick={loadData}
            className="ui-button-primary mx-auto mt-4 block rounded-lg px-4 py-2.5 text-sm font-semibold"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Sürüm Yönetimi"
        subtitle="Release ve deployment yönetimi."
      />
      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm">
        <div className="flex flex-col border-b border-[var(--color-border)] sm:flex-row sm:items-center sm:justify-between">
          <nav
            className="flex gap-1 overflow-x-auto px-4 pt-4 sm:px-6"
            aria-label="Sürüm yönetimi sekmeleri"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap rounded-t-lg px-4 py-3 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "border-b-2 border-[var(--brand-yellow)] text-[var(--color-text)]"
                    : "ui-text-muted hover:bg-[var(--color-surface2)]/50 hover:text-[var(--color-text)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-4 sm:p-6">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 p-5">
            {activeTab === "genel" && (
              <GenelBakisTab
                data={overview}
                onNewRelease={() => setReleaseModalOpen(true)}
                onNewDeploy={() => setDeployModalOpen(true)}
                onNewRollback={() => setRollbackModalOpen(true)}
              />
            )}
            {activeTab === "releases" && (
              <ReleasesTab
                releases={releases}
                onStatusChange={handleStatusChange}
                onCreateClick={() => setReleaseModalOpen(true)}
              />
            )}
            {activeTab === "deploys" && (
              <DeployGecmisiTab
                deployments={deployments}
                onCreateClick={() => setDeployModalOpen(true)}
              />
            )}
            {activeTab === "rollback" && (
              <RollbackTab
                rollbacks={rollbacks}
                onCreateClick={() => setRollbackModalOpen(true)}
              />
            )}
          </div>
        </div>
      </div>

      <ReleaseCreateModal
        isOpen={releaseModalOpen}
        onClose={() => setReleaseModalOpen(false)}
        onSubmit={handleCreateRelease}
      />
      <DeployCreateModal
        isOpen={deployModalOpen}
        onClose={() => setDeployModalOpen(false)}
        releases={releases}
        onSubmit={handleCreateDeploy}
      />
      <RollbackCreateModal
        isOpen={rollbackModalOpen}
        onClose={() => setRollbackModalOpen(false)}
        deployments={deployments}
        onSubmit={handleCreateRollback}
      />
    </div>
  );
}
