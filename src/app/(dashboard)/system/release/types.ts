import type { Release, Deployment, Rollback } from "@/lib/version/types";

export type DeploymentWithRelease = Deployment & {
  release?: { title?: string; version_tag?: string } | null;
};

export type OverviewData = {
  lastRelease: Release | null;
  lastDeployment: Deployment | null;
  currentProduction: {
    tag: string;
    commit_sha: string;
    deployed_at: string;
    release?: Release;
  } | null;
  releases: Release[];
  deployments: Deployment[];
};

export type { Release, Deployment, Rollback };
