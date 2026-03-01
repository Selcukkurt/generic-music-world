export { useModulePlansStore } from "./store";
export type { ModulePlan, ModulePlanStatus, ModulePlanRiskLevel, ModulePlanMilestone, ProgressMode, MilestoneWeight } from "./types";
export { computeProgressFromMilestones, getEffectiveProgress } from "./types";
export { computeHealthFromPlan } from "./types";
export { createMockModulePlans } from "./mock";
export {
  computeHealth,
  computeEtaConfidence,
  computeEtaConfidenceBreakdown,
  computeVelocityEta,
  getEffectiveEta,
  getGlobalHealthSummary,
  type GlobalHealthSummary,
  type ConfidenceBreakdown,
} from "./health-engine";
