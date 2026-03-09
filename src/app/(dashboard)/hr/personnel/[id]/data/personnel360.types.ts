/**
 * Centralized Personnel 360 data model.
 * Aggregates all tab and sidebar data for page-level orchestration.
 * Reuses existing tab interfaces; replace with API types when integrating real data.
 */

import type { OverviewData } from "../components/OverviewTabContent";
import type { FinanceTabData } from "../components/FinanceTabContent";
import type { WorkloadTabData } from "../components/TasksTabContent";
import type { OrganizationTabData } from "../components/OrganizationTabContent";
import type { PerformanceTabData } from "../components/PerformanceTabContent";
import type { HistoryTabData } from "../components/HistoryTabContent";
import type { SidebarData } from "../config/sidebar";
import type { PersonnelHeaderData } from "../components/PersonnelHeaderCard";
import type { KpiItem } from "../components/PersonnelKpiRow";

export interface Personnel360Data {
  header: PersonnelHeaderData;
  kpi: KpiItem[];
  overview: OverviewData;
  finance: FinanceTabData;
  tasks: WorkloadTabData;
  organization: OrganizationTabData;
  performance: PerformanceTabData;
  history: HistoryTabData;
  sidebar: SidebarData;
}
