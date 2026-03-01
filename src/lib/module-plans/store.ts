/**
 * module_plans store – single source of truth for GMW Pulse & Dashboard HUB
 * No window/localStorage – safe for SSR; only used inside Client Components.
 */

import { create } from "zustand";
import type { ModulePlan } from "./types";
import { createMockModulePlans, createResetTemplatePlans } from "./mock";

interface ModulePlansState {
  plans: Record<string, ModulePlan>;
  getPlan: (moduleCode: string) => ModulePlan | undefined;
  getPlansList: () => ModulePlan[];
  updatePlan: (moduleCode: string, updates: Partial<ModulePlan>) => void;
  addPlan: (plan: Omit<ModulePlan, "updated_at">, defaultOwner?: string) => void;
  bulkUpdatePlan: (moduleCodes: string[], updates: Partial<ModulePlan>) => void;
  reset: () => void;
  /** Reset all plans to template (planned, 0%, low risk, empty milestones). Super Admin only. */
  resetToTemplate: (defaultOwner: string) => void;
}

const initialPlans = createMockModulePlans();
const plansMap = Object.fromEntries(initialPlans.map((p) => [p.module_code, p]));

export const useModulePlansStore = create<ModulePlansState>((set, get) => ({
  plans: plansMap,

  getPlan: (moduleCode: string) => get().plans[moduleCode],

  getPlansList: () => Object.values(get().plans ?? {}),

  updatePlan: (moduleCode: string, updates: Partial<ModulePlan>) => {
    const plan = get().plans[moduleCode];
    if (!plan) return;
    const updated: ModulePlan = {
      ...plan,
      ...updates,
      updated_at: new Date().toISOString().slice(0, 10),
    };
    set((state) => ({
      plans: { ...state.plans, [moduleCode]: updated },
    }));
  },

  addPlan: (plan: Omit<ModulePlan, "updated_at">, defaultOwner?: string) => {
    const owner = plan.owner || defaultOwner || "—";
    const full: ModulePlan = {
      ...plan,
      owner,
      updated_at: new Date().toISOString().slice(0, 10),
    };
    set((state) => ({
      plans: { ...state.plans, [plan.module_code]: full },
    }));
  },

  bulkUpdatePlan: (moduleCodes: string[], updates: Partial<ModulePlan>) => {
    const now = new Date().toISOString().slice(0, 10);
    set((state) => {
      const next = { ...state.plans };
      for (const code of moduleCodes) {
        const plan = next[code];
        if (plan) next[code] = { ...plan, ...updates, updated_at: now };
      }
      return { plans: next };
    });
  },

  reset: () => set({ plans: Object.fromEntries(createMockModulePlans().map((p) => [p.module_code, p])) }),

  /** Reset to template (planned, 0%, low risk, empty). Uses set() to keep store listeners connected. */
  resetToTemplate: (defaultOwner: string) => {
    const plans = createResetTemplatePlans(defaultOwner);
    set((state) => ({ plans: Object.fromEntries(plans.map((p) => [p.module_code, p])) }));
  },
}));
