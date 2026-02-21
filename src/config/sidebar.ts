import type { Action, Resource } from "@/lib/rbac/types";

export type SidebarIconType =
  | "home"
  | "atom"
  | "activity"
  | "file-text"
  | "bell"
  | "user"
  | "check-circle"
  | "calendar"
  | "target"
  | "users"
  | "message-square"
  | "settings";

export type SidebarNavItem = {
  href: string;
  labelKey: string;
  icon: "core" | "personal";
  iconType: SidebarIconType;
  /** RBAC: required permission to show item. If omitted, item is always shown. */
  resource?: Resource;
  action?: Action;
};

/** GENEL / Core System items. */
export const coreItems: SidebarNavItem[] = [
  {
    href: "/dashboard",
    labelKey: "shell_core_item_1",
    icon: "core",
    iconType: "home",
    resource: "dashboard",
    action: "view",
  },
  {
    href: "/m01",
    labelKey: "shell_core_item_2",
    icon: "core",
    iconType: "atom",
    resource: "modules",
    action: "view",
  },
  {
    href: "/analytics",
    labelKey: "shell_core_item_3",
    icon: "core",
    iconType: "activity",
    resource: "dashboard",
    action: "view",
  },
  {
    href: "/audit-log",
    labelKey: "shell_core_item_4",
    icon: "core",
    iconType: "file-text",
    resource: "dashboard",
    action: "view",
  },
  {
    href: "/notifications",
    labelKey: "shell_core_item_5",
    icon: "core",
    iconType: "bell",
    resource: "notifications",
    action: "view",
  },
];

/** PERSONEL / Workforce items. */
export const personalItems: SidebarNavItem[] = [
  {
    href: "/profile",
    labelKey: "shell_personal_item_1",
    icon: "personal",
    iconType: "user",
    resource: "profile",
    action: "view",
  },
  {
    href: "/contracts",
    labelKey: "shell_personal_item_2",
    icon: "personal",
    iconType: "check-circle",
    resource: "dashboard",
    action: "view",
  },
  {
    href: "/calendar",
    labelKey: "shell_personal_item_3",
    icon: "personal",
    iconType: "calendar",
    resource: "dashboard",
    action: "view",
  },
  {
    href: "/events",
    labelKey: "shell_personal_item_4",
    icon: "personal",
    iconType: "target",
    resource: "dashboard",
    action: "view",
  },
  {
    href: "/personnel",
    labelKey: "shell_personal_item_5",
    icon: "personal",
    iconType: "users",
    resource: "personnel",
    action: "view",
  },
  {
    href: "/chat",
    labelKey: "shell_personal_item_6",
    icon: "personal",
    iconType: "message-square",
    resource: "dashboard",
    action: "view",
  },
  {
    href: "/settings",
    labelKey: "shell_personal_item_7",
    icon: "personal",
    iconType: "settings",
    resource: "settings",
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
