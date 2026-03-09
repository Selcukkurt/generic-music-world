/**
 * Personnel 360 sidebar data model.
 * Reusable across all tabs; structure is fixed, content can be overridden per tab.
 */

export type SidebarSectionId =
  | "current-status"
  | "critical-alerts"
  | "upcoming-dates"
  | "recent-actions"
  | "quick-access";

export const SIDEBAR_SECTION_IDS: SidebarSectionId[] = [
  "current-status",
  "critical-alerts",
  "upcoming-dates",
  "recent-actions",
  "quick-access",
];

export const SIDEBAR_SECTION_TITLES: Record<SidebarSectionId, string> = {
  "current-status": "Mevcut Durum",
  "critical-alerts": "Kritik Uyarılar",
  "upcoming-dates": "Yaklaşan Tarihler",
  "recent-actions": "Son Önemli İşlemler",
  "quick-access": "Hızlı Erişim",
};

// ─── Section data types (for real data integration) ────────────────────────

export interface CurrentStatusData {
  durum: string;
  sistemHesabi: string;
  onayBekleyen: number;
  acikGorev: number;
}

export type AlertLevel = "warning" | "danger" | "info";

export interface CriticalAlertItem {
  id: string;
  level: AlertLevel;
  message: string;
  meta?: string;
}

export interface UpcomingDateItem {
  id: string;
  label: string;
  type: string;
  date: string;
  daysRemaining: number | null;
}

export interface RecentActionItem {
  id: string;
  title: string;
  meta: string;
  time: string;
}

export interface QuickAccessItem {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface SidebarData {
  currentStatus: CurrentStatusData;
  criticalAlerts: CriticalAlertItem[];
  upcomingDates: UpcomingDateItem[];
  recentActions: RecentActionItem[];
  quickAccess: QuickAccessItem[];
}
