"use client";

import SectionCard from "./SectionCard";
import { getTabLabel, type PersonnelTabId } from "../config/tabs";

type PlaceholderTabContentProps = {
  tabId: PersonnelTabId;
};

export default function PlaceholderTabContent({ tabId }: PlaceholderTabContentProps) {
  return (
    <SectionCard title={getTabLabel(tabId)}>
      <p className="text-sm ui-text-muted">İçerik buraya eklenecek. ({tabId})</p>
      <div className="mt-4 h-32 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface2)]/20" />
    </SectionCard>
  );
}
