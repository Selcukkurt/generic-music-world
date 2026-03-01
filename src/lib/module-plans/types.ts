/**
 * module_plans – single source of truth for module planning data
 * Used by GMW Pulse and Dashboard HUB
 */

export type ModulePlanStatus = "planned" | "in_progress" | "done" | "blocked";
export type ModulePlanHealth = "on_track" | "behind" | "overdue" | "blocked";
export type ModulePlanRiskLevel = "none" | "low" | "medium" | "high" | "critical";

export type MilestoneWeight = 1 | 2 | 3 | 5;

export interface ModulePlanMilestone {
  id: string;
  title: string;
  done: boolean;
  /** Weight for progress calculation (default 1) */
  weight?: MilestoneWeight;
  due_date?: string | null;
  owner?: string | null;
}

export type ProgressMode = "manual" | "milestone";

/** Equal-share progress: progress = round((done/total)*100) */
export function computeProgressFromMilestones(milestones: ModulePlanMilestone[]): { progress: number; doneCount: number; totalCount: number } {
  if (milestones.length === 0) return { progress: 0, doneCount: 0, totalCount: 0 };
  const totalCount = milestones.length;
  const doneCount = milestones.filter((m) => m.done).length;
  const progress = Math.round((doneCount / totalCount) * 100);
  return { progress, doneCount, totalCount };
}

/** Get effective progress for display: milestone-based when progress_mode is "milestone", else manual */
export function getEffectiveProgress(plan: ModulePlan): { progress: number; doneCount: number; totalCount: number; label: string } {
  const milestones = plan.milestones ?? [];
  if (plan.progress_mode === "milestone" && milestones.length > 0) {
    const r = computeProgressFromMilestones(milestones);
    return { ...r, label: `${r.doneCount}/${r.totalCount} (%${r.progress})` };
  }
  return { progress: plan.progress, doneCount: 0, totalCount: 0, label: `%${plan.progress}` };
}

export interface ModulePlan {
  module_code: string;
  name: string;
  status: ModulePlanStatus;
  progress: number;
  /** Progress source: manual or computed from milestones */
  progress_mode?: ProgressMode;
  /** When true, adding a milestone defaults to done=true to preserve current progress */
  preserve_progress_on_add?: boolean;
  plan_start: string | null;
  plan_end: string | null;
  eta: string | null;
  owner: string;
  risk_level: ModulePlanRiskLevel;
  updated_at: string;
  /** Extended fields for drawer & display */
  description?: string;
  short_code?: string;
  team?: string;
  dependencies: string[];
  notes: string;
  milestones: ModulePlanMilestone[];
  actual_start?: string | null;
  actual_end?: string | null;
  /** Deep Dive: next actionable step */
  next_step?: string;
  /** Deep Dive: technical health (e.g. "API stable", "Tests pending") */
  technical_health?: string;
}

/** Compute health from plan (same logic as pulse computeHealth) */
export function computeHealthFromPlan(p: ModulePlan): ModulePlanHealth {
  const todayStr = new Date().toISOString().slice(0, 10);
  if (p.status === "blocked") return "blocked";
  if (p.status === "done") return "on_track";
  if (!p.plan_end || !/^\d{4}-\d{2}-\d{2}$/.test(p.plan_end)) return "on_track";
  if (todayStr > p.plan_end) return "overdue";
  const planStart = p.plan_start && /^\d{4}-\d{2}-\d{2}$/.test(p.plan_start) ? new Date(p.plan_start).getTime() : NaN;
  const planEnd = new Date(p.plan_end).getTime();
  if (Number.isNaN(planStart) || planStart === planEnd) return "on_track";
  const elapsed = (new Date().getTime() - planStart) / (planEnd - planStart);
  const expectedProgress = Math.min(100, Math.max(0, elapsed * 100));
  if (p.progress < expectedProgress - 10) return "behind";
  return "on_track";
}
