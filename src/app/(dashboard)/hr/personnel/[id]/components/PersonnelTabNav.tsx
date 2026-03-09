"use client";

import type { PersonnelTabId } from "../config/tabs";
import { PERSONNEL_TABS } from "../config/tabs";

type PersonnelTabNavProps = {
  activeTab: PersonnelTabId;
  onTabChange: (tabId: PersonnelTabId) => void;
};

export default function PersonnelTabNav({ activeTab, onTabChange }: PersonnelTabNavProps) {
  return (
    <nav className="flex flex-wrap gap-1 border-b border-[var(--color-border)]" role="tablist">
      {PERSONNEL_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`panel-${tab.id}`}
          id={`tab-${tab.id}`}
          onClick={() => onTabChange(tab.id)}
          className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${
            activeTab === tab.id
              ? "border-b-2 border-[var(--color-primary)] bg-[var(--color-surface2)]/50 text-[var(--color-text)]"
              : "ui-text-muted hover:bg-[var(--color-surface-hover)]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
