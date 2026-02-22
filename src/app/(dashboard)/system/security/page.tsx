"use client";

import { useState } from "react";
import PageHeader from "@/components/shell/PageHeader";
import GenelTab from "./GenelTab";
import ErisimPolitikalariTab from "./ErisimPolitikalariTab";
import OturumGirisTab from "./OturumGirisTab";
import ApiRateLimitTab from "./ApiRateLimitTab";
import AuditLoglarTab from "./AuditLoglarTab";

const TABS = [
  { id: "genel", label: "Genel", Component: GenelTab },
  { id: "erisim", label: "Erişim Politikaları (RLS)", Component: ErisimPolitikalariTab },
  { id: "oturum", label: "Oturum & Giriş", Component: OturumGirisTab },
  { id: "api", label: "API & Rate Limit", Component: ApiRateLimitTab },
  { id: "audit", label: "Audit & Loglar", Component: AuditLoglarTab },
] as const;

export default function SystemSecurityPage() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("genel");
  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.Component ?? GenelTab;

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Güvenlik"
        subtitle="Güvenlik politikaları ve erişim denetimi."
      />
      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm">
        <div className="flex flex-col border-b border-[var(--color-border)] sm:flex-row sm:items-center sm:justify-between">
          <nav
            className="flex gap-1 overflow-x-auto px-4 pt-4 sm:px-6"
            aria-label="Güvenlik sekmeleri"
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
