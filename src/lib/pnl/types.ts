/**
 * P&L Workspace types for Event Operations (M02)
 */

export type PnlStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "rejected"
  | "archived";

export interface PnlMeta {
  pnlName?: string;
  eventName?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  expectedAttendance?: number;
  ticketPrice?: number;
  notes?: string;
}

export interface RevenueLine {
  id: string;
  category: string;
  quantity: number;
  unitPrice: number;
  feePercent: number;
  net: number;
}

export interface CostLine {
  id: string;
  category: string;
  quantity: number;
  unitPrice: number;
  feePercent?: number;
  total: number;
}

export interface PnlTotals {
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  marginPercent: number;
  breakevenAttendance: number;
}

export interface EventPnl {
  id: string;
  name: string;
  status: PnlStatus;
  event_id: string | null;
  meta: PnlMeta;
  revenue_lines: RevenueLine[];
  cost_lines: CostLine[];
  totals: PnlTotals;
  created_at: string;
  updated_at: string;
}
