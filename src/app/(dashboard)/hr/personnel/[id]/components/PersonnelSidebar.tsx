"use client";

import SectionCard from "./SectionCard";
import {
  SIDEBAR_SECTION_IDS,
  SIDEBAR_SECTION_TITLES,
  type SidebarSectionId,
  type SidebarData,
} from "../config/sidebar";
import { getMockSidebarData } from "../config/sidebarData";
import {
  CurrentStatusSection,
  CriticalAlertsSection,
  UpcomingDatesSection,
  RecentActionsSection,
  QuickAccessSection,
} from "./sidebar";

export type SidebarContentMap = Partial<Record<SidebarSectionId, React.ReactNode>>;

type PersonnelSidebarProps = {
  personnelId: string;
  data?: Partial<SidebarData>;
  contentOverrides?: SidebarContentMap;
};

function buildDefaultContent(
  sectionId: SidebarSectionId,
  data: SidebarData
): React.ReactNode {
  switch (sectionId) {
    case "current-status":
      return <CurrentStatusSection data={data.currentStatus} />;
    case "critical-alerts":
      return <CriticalAlertsSection items={data.criticalAlerts} />;
    case "upcoming-dates":
      return <UpcomingDatesSection items={data.upcomingDates} />;
    case "recent-actions":
      return <RecentActionsSection items={data.recentActions} />;
    case "quick-access":
      return <QuickAccessSection items={data.quickAccess} />;
    default:
      return null;
  }
}

export default function PersonnelSidebar({
  personnelId,
  data: dataOverride,
  contentOverrides = {},
}: PersonnelSidebarProps) {
  const fullData: SidebarData = {
    ...getMockSidebarData(personnelId),
    ...dataOverride,
  };

  return (
    <aside className="flex flex-col gap-4 lg:min-w-[280px] lg:max-w-[320px]">
      {SIDEBAR_SECTION_IDS.map((id) => (
        <SectionCard key={id} title={SIDEBAR_SECTION_TITLES[id]}>
          {contentOverrides[id] ?? buildDefaultContent(id, fullData)}
        </SectionCard>
      ))}
    </aside>
  );
}
