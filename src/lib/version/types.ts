export type ReleaseStatus = "DRAFT" | "READY" | "DEPLOYED" | "ROLLED_BACK";
export type DeployEnvironment = "LOCAL" | "STAGING" | "PRODUCTION";
export type DeployStatus = "SUCCESS" | "FAILED" | "IN_PROGRESS";

export type Release = {
  id: string;
  release_id: string;
  version_tag: string;
  title: string;
  summary: string;
  status: ReleaseStatus;
  created_by: string | null;
  created_at: string;
  approved_by: string | null;
  approved_at: string | null;
};

export type Deployment = {
  id: string;
  deploy_id: string;
  release_id: string;
  environment: DeployEnvironment;
  commit_sha: string;
  tag: string;
  status: DeployStatus;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
  created_by: string | null;
  release?: Release;
};

export type Rollback = {
  id: string;
  rollback_id: string;
  from_deploy_id: string;
  to_deploy_id: string;
  reason: string;
  executed_by: string | null;
  executed_at: string;
  from_deploy?: Deployment;
  to_deploy?: Deployment;
};
