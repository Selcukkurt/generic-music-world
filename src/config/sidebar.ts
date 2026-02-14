import type { Action, Resource } from "@/lib/rbac/types";

export type SidebarNavItem = {
  href: string;
  labelKey: string;
  icon: "core" | "personal";
  /** RBAC: required permission to show item. If omitted, item is always shown. */
  resource?: Resource;
  action?: Action;
};

/** Placeholder items for layout slot. Names are not final. */
export const coreItems: SidebarNavItem[] = [
  {
    href: "/dashboard",
    labelKey: "shell_core_item_1",
    icon: "core",
    resource: "dashboard",
    action: "view",
  },
  {
    href: "/m01",
    labelKey: "shell_core_item_2",
    icon: "core",
    resource: "modules",
    action: "view",
  },
];

export const personalItems: SidebarNavItem[] = [
  {
    href: "/profile",
    labelKey: "shell_personal_item_1",
    icon: "personal",
    resource: "profile",
    action: "view",
  },
  {
    href: "/notifications",
    labelKey: "shell_personal_item_2",
    icon: "personal",
    resource: "notifications",
    action: "view",
  },
  {
    href: "/settings",
    labelKey: "shell_personal_item_3",
    icon: "personal",
    resource: "settings",
    action: "view",
  },
  {
    href: "/personnel",
    labelKey: "sidebar_personnel",
    icon: "personal",
    resource: "personnel",
    action: "view",
  },
];

export type ModuleSubItem = {
  href: string;
  labelKey: string;
};

/** Placeholder items for right context panel on /m01* routes. */
export const contextPanelItems: ModuleSubItem[] = [
  { href: "/m01", labelKey: "shell_context_item_1" },
  { href: "/m01/events", labelKey: "shell_context_item_2" },
  { href: "/m01/orders", labelKey: "shell_context_item_3" },
  { href: "/m01/reports", labelKey: "shell_context_item_4" },
  { href: "/m01/settings", labelKey: "shell_context_item_5" },
];
