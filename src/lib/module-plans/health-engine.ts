/**
 * GMW Pulse V2 – ETA + Confidence engine
 * Velocity-based ETA, stability, milestone ratio, schedule deviation
 */

import type { ModulePlan, ModulePlanHealth } from "./types";

const todayStr = () => new Date().toISOString().slice(0, 10);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function safeDate(d?: string | null): Date | null {
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Compute health for a single module */
export function computeHealth(p: ModulePlan): ModulePlanHealth {
  const today = todayStr();
  if (p.status === "blocked") return "blocked";
  if (p.status === "done") return "on_track";
  if (!p.plan_end || !/^\d{4}-\d{2}-\d{2}$/.test(p.plan_end)) return "on_track";
  if (today > p.plan_end) return "overdue";
  const planStart = p.plan_start && /^\d{4}-\d{2}-\d{2}$/.test(p.plan_start) ? new Date(p.plan_start).getTime() : NaN;
  const planEnd = new Date(p.plan_end).getTime();
  if (Number.isNaN(planStart) || planStart === planEnd) return "on_track";
  const elapsed = (new Date().getTime() - planStart) / (planEnd - planStart);
  const expectedProgress = Math.min(100, Math.max(0, elapsed * 100));
  if (p.progress < expectedProgress - 10) return "behind";
  return "on_track";
}

/**
 * Velocity-based ETA: extrapolate from progress velocity.
 * Fallback to plan_end if insufficient data.
 */
export function computeVelocityEta(p: ModulePlan): string | null {
  if (p.status === "done") return p.actual_end ?? p.plan_end ?? null;
  const planStart = safeDate(p.plan_start);
  const planEnd = safeDate(p.plan_end);
  if (!planStart || !planEnd || p.progress <= 0) return p.eta ?? p.plan_end;
  const elapsedDays = (Date.now() - planStart.getTime()) / MS_PER_DAY;
  if (elapsedDays <= 0) return p.eta ?? p.plan_end;
  const velocity = p.progress / elapsedDays;
  if (velocity <= 0) return p.eta ?? p.plan_end;
  const remainingProgress = 100 - p.progress;
  const daysToComplete = remainingProgress / velocity;
  const etaDate = new Date(Date.now() + daysToComplete * MS_PER_DAY);
  return etaDate.toISOString().slice(0, 10);
}

/** Explainable 3-part confidence breakdown */
export interface ConfidenceBreakdown {
  A_time: number;   // Time performance (health-based)
  B_progress: number; // Progress vs expected (plan timeline)
  C_risk: number;    // Risk/Blocked penalties
  score: number;
}

/**
 * Explainable confidence 0–100:
 * A: Time performance (health-based scoring)
 * B: Progress vs expected (plan timeline)
 * C: Risk/Blocked penalties
 */
export function computeEtaConfidenceBreakdown(p: ModulePlan): ConfidenceBreakdown {
  if (p.status === "done") return { A_time: 100, B_progress: 100, C_risk: 100, score: 100 };

  // A: Time performance (health-based)
  const health = computeHealth(p);
  const A_time = health === "on_track" ? 100 : health === "behind" ? 55 : health === "overdue" ? 25 : 0;

  // B: Progress vs expected (plan timeline)
  const planStart = safeDate(p.plan_start);
  const planEnd = safeDate(p.plan_end);
  let B_progress = 65;
  if (planStart && planEnd) {
    const elapsed = (Date.now() - planStart.getTime()) / (planEnd.getTime() - planStart.getTime());
    const expectedProgress = Math.min(100, Math.max(0, elapsed * 100));
    const delta = p.progress - expectedProgress;
    if (delta >= 15) B_progress = 95;
    else if (delta >= 0) B_progress = 80;
    else if (delta >= -15) B_progress = 55;
    else B_progress = 30;
  }

  // C: Risk/Blocked penalties (starts at 100, subtract penalties)
  const riskPenalty = { none: 0, low: 0, medium: 12, high: 22, critical: 35 }[p.risk_level];
  const blockedPenalty = p.status === "blocked" ? 40 : 0;
  const C_risk = Math.max(0, 100 - riskPenalty - blockedPenalty);

  const score = Math.round((A_time * 0.35 + B_progress * 0.4 + C_risk * 0.25));
  return { A_time, B_progress, C_risk, score: Math.max(0, Math.min(100, score)) };
}

/** Legacy: single score (uses breakdown internally) */
export function computeEtaConfidence(p: ModulePlan): number {
  return computeEtaConfidenceBreakdown(p).score;
}

/** Get effective ETA: velocity-based if in progress, else plan_end/eta */
export function getEffectiveEta(p: ModulePlan): string | null {
  if (p.status === "done") return p.actual_end ?? p.plan_end ?? null;
  if (p.status === "blocked") return p.eta ?? p.plan_end ?? null;
  return p.eta ?? computeVelocityEta(p) ?? p.plan_end ?? null;
}

export interface GlobalHealthSummary {
  on_track: number;
  risk: number;
  behind: number;
  blocked: number;
  overdue: number;
  avgProgress: number;
  finalEta: string | null;
  /** ETA trend: +N = N days late, -N = N days early, 0 = on time */
  etaTrendDays: number | null;
  confidence: number;
  confidenceBreakdown: { A_time: number; B_progress: number; C_risk: number };
  total: number;
}

/** Global health summary for Executive View – derives ONLY from plans, no fallbacks. */
export function getGlobalHealthSummary(plans: ModulePlan[]): GlobalHealthSummary {
  const list = plans.filter((p) => p.status !== "done");
  const withHealth = list.map((p) => ({ ...p, health: computeHealth(p) }));
  const on_track = withHealth.filter((p) => p.health === "on_track").length;
  const risk = withHealth.filter((p) => p.risk_level === "high" || p.risk_level === "critical").length;
  const behind = withHealth.filter((p) => p.health === "behind").length;
  const overdue = withHealth.filter((p) => p.health === "overdue").length;
  const blocked = withHealth.filter((p) => p.health === "blocked").length;
  const allPlans = plans.map((p) => ({ ...p, health: computeHealth(p) }));
  const avgProgress =
    allPlans.length > 0 ? Math.round(allPlans.reduce((a, b) => a + b.progress, 0) / allPlans.length) : 0;

  // Only consider ETA from modules with valid plan_end (YYYY-MM-DD)
  const hasValidPlanEnds = list.some((p) => p.plan_end && /^\d{4}-\d{2}-\d{2}$/.test(p.plan_end));
  const etas = hasValidPlanEnds
    ? list
        .filter((p) => p.plan_end && /^\d{4}-\d{2}-\d{2}$/.test(p.plan_end))
        .map((p) => getEffectiveEta(p))
        .filter((x): x is string => !!x && /^\d{4}-\d{2}-\d{2}$/.test(x))
    : [];
  const finalEta = etas.length > 0 ? etas.reduce((a, b) => (a > b ? a : b)) : null;
  const confidences = list.map(computeEtaConfidenceBreakdown);
  const confidence = hasValidPlanEnds && confidences.length > 0
    ? Math.round(confidences.reduce((a, b) => a + b.score, 0) / confidences.length)
    : 0;
  const confidenceBreakdown = hasValidPlanEnds && confidences.length > 0
    ? {
        A_time: Math.round(confidences.reduce((a, b) => a + b.A_time, 0) / confidences.length),
        B_progress: Math.round(confidences.reduce((a, b) => a + b.B_progress, 0) / confidences.length),
        C_risk: Math.round(confidences.reduce((a, b) => a + b.C_risk, 0) / confidences.length),
      }
    : { A_time: 0, B_progress: 0, C_risk: 0 };
  const maxPlanEnd = list
    .map((p) => safeDate(p.plan_end))
    .filter((x): x is Date => !!x)
    .reduce<Date | null>((a, b) => (!a || b > a ? b : a), null);
  let etaTrendDays: number | null = null;
  if (finalEta && maxPlanEnd) {
    const finalEtaDate = safeDate(finalEta);
    if (finalEtaDate) {
      etaTrendDays = Math.round((finalEtaDate.getTime() - maxPlanEnd.getTime()) / MS_PER_DAY);
    }
  }
  return {
    on_track,
    risk,
    behind,
    blocked,
    overdue,
    avgProgress,
    finalEta,
    etaTrendDays,
    confidence,
    confidenceBreakdown,
    total: plans.length,
  };
}
