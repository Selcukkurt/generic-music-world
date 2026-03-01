/**
 * Mock module_plans – derived from pulse data, later replace with DB fetch
 */

import type { ModulePlan, ModulePlanMilestone } from "./types";
import { PULSE_MODULES } from "@/lib/pulse/data";

export function createMockModulePlans(): ModulePlan[] {
  return PULSE_MODULES.map((m) => ({
    module_code: m.id,
    name: m.name,
    status: m.status,
    progress: m.progress,
    plan_start: m.plan_start,
    plan_end: m.plan_end,
    eta: m.eta,
    owner: m.owner,
    risk_level: m.risk,
    updated_at: m.last_update,
    description: m.description,
    short_code: m.shortCode,
    team: m.team,
    dependencies: [...m.dependencies],
    notes: m.notes,
    milestones: m.milestones.map((mil): ModulePlanMilestone => ({ ...mil })),
    progress_mode: "manual",
    actual_start: m.actual_start,
    actual_end: m.actual_end,
  }));
}

/** Reset template: clean planning baseline, keeps module list intact. All dates null. */
export function createResetTemplatePlans(defaultOwner: string): ModulePlan[] {
  const now = new Date().toISOString().slice(0, 10);
  return PULSE_MODULES.map((m) => ({
    module_code: m.id,
    name: m.name,
    status: "planned" as const,
    progress: 0,
    risk_level: "low" as const,
    plan_start: null,
    plan_end: null,
    eta: null,
    owner: defaultOwner || "GMW Super Admin",
    updated_at: now,
    description: m.description,
    short_code: m.shortCode,
    team: m.team,
    dependencies: [],
    notes: "",
    next_step: "",
    milestones: [],
    progress_mode: "manual" as const,
    actual_start: null,
    actual_end: null,
  }));
}
