"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/shell/PageHeader";
import GenelTab from "./GenelTab";
import BildirimAyarlariTab from "./BildirimAyarlariTab";
import GuvenlikTab from "./GuvenlikTab";
import SistemTab from "./SistemTab";
import PersonnelSettingsClient from "../personnel-settings/PersonnelSettingsClient";

const TABS = [
  { id: "genel", label: "Genel", Component: GenelTab },
  { id: "bildirim", label: "Bildirim Ayarları", Component: BildirimAyarlariTab },
  { id: "guvenlik", label: "Güvenlik", Component: GuvenlikTab },
  { id: "personnel", label: "Personel Ayarları", Component: PersonnelSettingsClient },
  { id: "sistem", label: "Sistem", Component: SistemTab },
] as const;

type TabId = (typeof TABS)[number]["id"];

const DEFAULT_TAB: TabId = "genel";

function PersonnelTabWrapper() {
  return <PersonnelSettingsClient embedded />;
}

export default function SettingsClient() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (tabParam && TABS.some((t) => t.id === tabParam)) return tabParam;
    return DEFAULT_TAB;
  });

  useEffect(() => {
    if (tabParam && TABS.some((t) => t.id === tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  const handleTabChange = useCallback(
    (id: TabId) => {
      setActiveTab(id);
      const url = new URL(window.location.href);
      url.searchParams.set("tab", id);
      window.history.replaceState({}, "", url.pathname + "?" + url.searchParams.toString());
    },
    []
  );

  const tab = TABS.find((t) => t.id === activeTab);
  const ActiveComponent = tab?.id === "personnel" ? PersonnelTabWrapper : tab?.Component ?? GenelTab;

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Ayarlar"
        subtitle="Genel tercihler, bildirimler, güvenlik ve personel ayarları."
      />
      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm">
        <div className="flex flex-col border-b border-[var(--color-border)] sm:flex-row sm:items-center sm:justify-between">
          <nav
            className="flex gap-1 overflow-x-auto px-4 pt-4 sm:px-6"
            aria-label="Ayarlar sekmeleri"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTabChange(t.id)}
                className={`whitespace-nowrap rounded-t-lg px-4 py-3 text-sm font-medium transition ${
                  activeTab === t.id
                    ? "border-b-2 border-[var(--brand-yellow)] text-[var(--color-text)]"
                    : "ui-text-muted hover:bg-[var(--color-surface2)]/50 hover:text-[var(--color-text)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-4 sm:p-6">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 p-5">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </div>
  );
}
