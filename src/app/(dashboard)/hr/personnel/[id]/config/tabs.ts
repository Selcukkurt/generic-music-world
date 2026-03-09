/**
 * Personnel 360 tab configuration.
 * Data-driven structure for tab navigation and content rendering.
 */

export const PERSONNEL_TABS = [
  { id: "overview", label: "Genel Bakış" },
  { id: "finance", label: "Finans & Sözleşme" },
  { id: "tasks", label: "Görevler & Etkinlikler" },
  { id: "org", label: "Organizasyon & Hiyerarşi" },
  { id: "performance", label: "Performans & 360 Geri Bildirim" },
  { id: "history", label: "Geçmiş & Aktivite" },
] as const;

export type PersonnelTabId = (typeof PERSONNEL_TABS)[number]["id"];

export function getTabById(id: PersonnelTabId) {
  return PERSONNEL_TABS.find((t) => t.id === id);
}

export function getTabLabel(id: PersonnelTabId): string {
  return getTabById(id)?.label ?? id;
}
