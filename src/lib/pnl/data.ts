/**
 * P&L Workspace data layer – Supabase with mock fallback
 */

import { supabaseBrowser } from "@/lib/supabase/client";
import type { EventPnl, PnlMeta, RevenueLine, CostLine, PnlTotals } from "./types";

const DEFAULT_REVENUE: RevenueLine[] = [
  { id: "r1", category: "Ticket Sales", quantity: 0, unitPrice: 0, feePercent: 0, net: 0 },
  { id: "r2", category: "Sponsorship", quantity: 0, unitPrice: 0, feePercent: 0, net: 0 },
  { id: "r3", category: "Vendor Fees", quantity: 0, unitPrice: 0, feePercent: 0, net: 0 },
  { id: "r4", category: "Other", quantity: 0, unitPrice: 0, feePercent: 0, net: 0 },
];

const DEFAULT_COSTS: CostLine[] = [
  { id: "c1", category: "Venue", quantity: 0, unitPrice: 0, total: 0 },
  { id: "c2", category: "Production", quantity: 0, unitPrice: 0, total: 0 },
  { id: "c3", category: "Security", quantity: 0, unitPrice: 0, total: 0 },
  { id: "c4", category: "Logistics", quantity: 0, unitPrice: 0, total: 0 },
  { id: "c5", category: "Marketing", quantity: 0, unitPrice: 0, total: 0 },
  { id: "c6", category: "Staff", quantity: 0, unitPrice: 0, total: 0 },
  { id: "c7", category: "Other", quantity: 0, unitPrice: 0, total: 0 },
];

function genId() {
  return `pnl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function computeRevenueNet(line: RevenueLine): number {
  const gross = line.quantity * line.unitPrice;
  const fee = gross * (line.feePercent / 100);
  return Math.round((gross - fee) * 100) / 100;
}

function computeCostTotal(line: CostLine): number {
  const base = line.quantity * line.unitPrice;
  const fee = (line.feePercent ?? 0) / 100 * base;
  return Math.round((base + fee) * 100) / 100;
}

export function computeTotals(
  revenueLines: RevenueLine[],
  costLines: CostLine[],
  ticketPrice?: number,
  attendance?: number
): PnlTotals {
  const revs = revenueLines.map((r) => {
    if (r.category === "Ticket Sales" && attendance != null && ticketPrice != null) {
      return attendance * ticketPrice * (1 - (r.feePercent || 0) / 100);
    }
    return r.net;
  });
  const totalRevenue = revs.reduce((a, b) => a + b, 0);
  const totalCosts = costLines.reduce((a, b) => a + b.total, 0);
  const grossProfit = totalRevenue - totalCosts;
  const marginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const ticketNetPerPerson =
    ticketPrice != null && ticketPrice > 0
      ? ticketPrice * (1 - (revenueLines.find((r) => r.category === "Ticket Sales")?.feePercent ?? 0) / 100)
      : 0;
  const breakevenAttendance =
    ticketNetPerPerson > 0 ? Math.ceil(totalCosts / ticketNetPerPerson) : 0;

  return {
    totalRevenue,
    totalCosts,
    grossProfit,
    marginPercent,
    breakevenAttendance,
  };
}

export function createEmptyPnl(): EventPnl {
  const now = new Date().toISOString();
  const id = genId();
  const revenue = DEFAULT_REVENUE.map((r) => ({ ...r, id: `${id}-${r.id}` }));
  const cost = DEFAULT_COSTS.map((c) => ({ ...c, id: `${id}-${c.id}` }));
  const totals = computeTotals(revenue, cost);

  return {
    id,
    name: `P&L ${new Date().toLocaleDateString("tr-TR")}`,
    status: "draft",
    event_id: null,
    meta: {},
    revenue_lines: revenue,
    cost_lines: cost,
    totals,
    created_at: now,
    updated_at: now,
  };
}

export async function fetchEventPnl(id?: string | null): Promise<EventPnl | null> {
  if (!id) return null;
  try {
    const { data, error } = await supabaseBrowser
      .from("event_pnl")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data as EventPnl;
  } catch {
    return null;
  }
}

export async function fetchLatestDraftPnl(): Promise<EventPnl | null> {
  try {
    const { data, error } = await supabaseBrowser
      .from("event_pnl")
      .select("*")
      .eq("status", "draft")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as EventPnl | null;
  } catch {
    return null;
  }
}

export async function saveEventPnl(pnl: EventPnl): Promise<EventPnl> {
  try {
    const row = {
      id: pnl.id,
      name: pnl.name,
      status: pnl.status,
      event_id: pnl.event_id,
      meta: pnl.meta,
      revenue_lines: pnl.revenue_lines,
      cost_lines: pnl.cost_lines,
      totals: pnl.totals,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseBrowser
      .from("event_pnl")
      .upsert(row, { onConflict: "id" })
      .select()
      .single();

    if (error) throw error;
    return data as EventPnl;
  } catch {
    throw new Error("P&L kaydedilemedi.");
  }
}

export async function updatePnlStatus(
  id: string,
  status: EventPnl["status"]
): Promise<EventPnl> {
  try {
    const { data, error } = await supabaseBrowser
      .from("event_pnl")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as EventPnl;
  } catch {
    throw new Error("Durum güncellenemedi.");
  }
}

export async function softDeletePnl(id: string): Promise<void> {
  try {
    const { error } = await supabaseBrowser
      .from("event_pnl")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
  } catch {
    throw new Error("Silinemedi.");
  }
}

export { computeRevenueNet, computeCostTotal };
export type { EventPnl, PnlMeta, RevenueLine, CostLine, PnlTotals };
