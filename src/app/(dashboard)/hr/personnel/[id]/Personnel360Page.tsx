"use client";

import Link from "next/link";
import { useState } from "react";
import type { PersonnelTabId } from "./config/tabs";
import type { Personnel360Data } from "./data/personnel360.types";
import { getPersonnel360MockData } from "./data/personnel360.mock";
import PersonnelHeaderCard from "./components/PersonnelHeaderCard";
import PersonnelKpiRow from "./components/PersonnelKpiRow";
import PersonnelSidebar from "./components/PersonnelSidebar";
import PersonnelTabNav from "./components/PersonnelTabNav";
import FinanceTabContent from "./components/FinanceTabContent";
import HistoryTabContent from "./components/HistoryTabContent";
import OrganizationTabContent from "./components/OrganizationTabContent";
import OverviewTabContent from "./components/OverviewTabContent";
import PerformanceTabContent from "./components/PerformanceTabContent";
import PlaceholderTabContent from "./components/PlaceholderTabContent";
import TasksTabContent from "./components/TasksTabContent";

// ─── Tab content renderer ───────────────────────────────────────────────────
function renderTabContent(tabId: PersonnelTabId, data: Personnel360Data) {
  switch (tabId) {
    case "overview":
      return <OverviewTabContent data={data.overview} />;
    case "finance":
      return <FinanceTabContent data={data.finance} />;
    case "tasks":
      return <TasksTabContent data={data.tasks} />;
    case "org":
      return <OrganizationTabContent data={data.organization} />;
    case "performance":
      return <PerformanceTabContent data={data.performance} />;
    case "history":
      return <HistoryTabContent data={data.history} />;
    default:
      return <PlaceholderTabContent tabId={tabId} />;
  }
}

// ─── Main page ──────────────────────────────────────────────────────────────
type Personnel360PageProps = {
  personnelId: string;
};

export default function Personnel360Page({ personnelId }: Personnel360PageProps) {
  const [activeTab, setActiveTab] = useState<PersonnelTabId>("overview");
  const data: Personnel360Data = getPersonnel360MockData(personnelId);

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Page title */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="ui-heading-page">360° Personel Kartı</h1>
          <p className="mt-1 text-sm ui-text-muted">Personel ID: {personnelId}</p>
        </div>
        <Link
          href="/m04/personel"
          className="w-fit rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
        >
          Listeye Dön
        </Link>
      </header>

      {/* Profile header card */}
      <PersonnelHeaderCard
        data={data.header}
        actions={[
          { label: "Düzenle" },
          { label: "Rol Ata" },
          { label: "Organizasyonda Göster" },
          { label: "Görevlerini Gör" },
        ]}
      />

      {/* KPI row */}
      <PersonnelKpiRow items={data.kpi} />

      {/* Main content + sidebar */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <PersonnelTabNav activeTab={activeTab} onTabChange={setActiveTab} />

          <div
            id={`panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            className="min-w-0"
          >
            {renderTabContent(activeTab, data)}
          </div>
        </div>

        <PersonnelSidebar personnelId={personnelId} data={data.sidebar} contentOverrides={{}} />
      </div>
    </div>
  );
}
