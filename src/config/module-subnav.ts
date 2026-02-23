/**
 * Module subnav config: right-panel menu items for each module (M01–M12).
 * Used by ModuleRightPanel when on /m0x/* routes.
 */

export type ModuleSubnavItem = {
  href: string;
  labelKey: string;
};

export type ModuleSubnavConfig = {
  /** i18n key for module title in right panel header */
  titleKey: string;
  items: ModuleSubnavItem[];
};

const defaultSubnavItems = (basePath: string): ModuleSubnavItem[] => [
  { href: basePath, labelKey: "sidebar_sub_overview" },
  { href: `${basePath}/list`, labelKey: "sidebar_sub_list" },
  { href: `${basePath}/reports`, labelKey: "sidebar_sub_reports" },
  { href: `${basePath}/settings`, labelKey: "sidebar_sub_settings" },
];

/** Right-panel subnav config per module. Add/override items per module. */
export const moduleSubnavConfig: Record<string, ModuleSubnavConfig> = {
  m01: {
    titleKey: "m01_subnav_title",
    items: [
      { href: "/m01", labelKey: "m01_subnav_overview" },
      { href: "/m01/event-sales", labelKey: "m01_subnav_event_sales" },
      { href: "/m01/inventory", labelKey: "m01_subnav_inventory" },
      { href: "/m01/campaigns", labelKey: "m01_subnav_campaigns" },
      { href: "/m01/refunds", labelKey: "m01_subnav_refunds" },
      { href: "/m01/reports", labelKey: "m01_subnav_reports" },
      { href: "/m01/settings", labelKey: "m01_subnav_settings" },
    ],
  },
  m02: {
    titleKey: "module_name_m02",
    items: [
      { href: "/m02", labelKey: "sidebar_sub_overview" },
      { href: "/m02/events", labelKey: "m02_events_title" },
      { href: "/m02/reports", labelKey: "sidebar_sub_reports" },
      { href: "/m02/settings", labelKey: "sidebar_sub_settings" },
    ],
  },
  m03: {
    titleKey: "module_name_m03",
    items: defaultSubnavItems("/m03"),
  },
  m04: {
    titleKey: "module_name_m04",
    items: defaultSubnavItems("/m04"),
  },
  m05: {
    titleKey: "module_name_m05",
    items: defaultSubnavItems("/m05"),
  },
  m06: {
    titleKey: "module_name_m06",
    items: defaultSubnavItems("/m06"),
  },
  m07: {
    titleKey: "module_name_m07",
    items: defaultSubnavItems("/m07"),
  },
  m08: {
    titleKey: "module_name_m08",
    items: defaultSubnavItems("/m08"),
  },
  m09: {
    titleKey: "module_name_m09",
    items: defaultSubnavItems("/m09"),
  },
  m10: {
    titleKey: "module_name_m10",
    items: defaultSubnavItems("/m10"),
  },
  m11: {
    titleKey: "module_name_m11",
    items: defaultSubnavItems("/m11"),
  },
  m12: {
    titleKey: "module_name_m12",
    items: defaultSubnavItems("/m12"),
  },
};

export function getModuleSubnavConfig(moduleId: string): ModuleSubnavConfig | null {
  return moduleSubnavConfig[moduleId] ?? null;
}
