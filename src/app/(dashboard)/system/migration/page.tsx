"use client";

import { useState } from "react";
import PageHeader from "@/components/shell/PageHeader";
import IceAktarTab from "./IceAktarTab";
import DisaAktarTab from "./DisaAktarTab";
import EslestirmeTab from "./EslestirmeTab";
import DogrulamaTab from "./DogrulamaTab";
import GecmisTab from "./GecmisTab";

const TABS = [
  { id: "ice", label: "İçe Aktar", Component: IceAktarTab },
  { id: "disa", label: "Dışa Aktar", Component: DisaAktarTab },
  { id: "eslestirme", label: "Eşleştirme", Component: EslestirmeTab },
  { id: "dogrulama", label: "Doğrulama", Component: DogrulamaTab },
  { id: "gecmis", label: "Geçmiş", Component: GecmisTab },
] as const;

export default function SystemMigrationPage() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("ice");
  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.Component ?? IceAktarTab;

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Veri Taşıma"
        subtitle="Veritabanı migrasyonları ve veri aktarımı."
      />
      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm">
        <div className="flex flex-col border-b border-[var(--color-border)] sm:flex-row sm:items-center sm:justify-between">
          <nav
            className="flex gap-1 overflow-x-auto px-4 pt-4 sm:px-6"
            aria-label="Veri taşıma sekmeleri"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap rounded-t-lg px-4 py-3 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "border-b-2 border-[var(--brand-yellow)] text-[var(--color-text)]"
                    : "ui-text-muted hover:bg-[var(--color-surface2)]/50 hover:text-[var(--color-text)]"
                }`}
              >
                {tab.label}
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
