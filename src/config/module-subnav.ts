/**
 * Module subnav config: right-panel menu items for each module (M01–M12).
 * Used by ModuleRightPanel when on /m0x/* routes.
 */

export type ModuleSubnavItem = {
  href: string;
  labelKey: string;
};

export type ModuleSubnavSection = {
  labelKey: string;
  items: ModuleSubnavItem[];
};

export type ModuleSubnavConfig = {
  /** i18n key for module title in right panel header */
  titleKey: string;
  /** Flat items (used when sections not provided) */
  items?: ModuleSubnavItem[];
  /** Sectioned items (when provided, used instead of items) */
  sections?: ModuleSubnavSection[];
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
      { href: "/m02/overview", labelKey: "sidebar_sub_overview" },
      { href: "/m02/events", labelKey: "m02_events_title" },
      { href: "/m02/pnl", labelKey: "m02_pnl_title" },
      { href: "/m02/workflow", labelKey: "m02_workflow_title" },
      { href: "/m02/reports", labelKey: "sidebar_sub_reports" },
      { href: "/m02/settings", labelKey: "sidebar_sub_settings" },
    ],
  },
  m03: {
    titleKey: "module_name_m03",
    items: defaultSubnavItems("/modules/m03"),
  },
  m04: {
    titleKey: "module_name_m04",
    sections: [
      {
        labelKey: "m04_nav_section_personnel_base",
        items: [
          { href: "/m04/personel", labelKey: "m04_nav_personnel_list" },
          { href: "/m04/personel/yeni", labelKey: "m04_nav_add_personnel" },
          { href: "/m04/personel/kart", labelKey: "m04_nav_personnel_card_360" },
          { href: "/m04/personel/sicil", labelKey: "m04_nav_digital_record_feedback" },
          { href: "/m04/personel/kara-liste", labelKey: "m04_nav_blacklist" },
        ],
      },
      {
        labelKey: "m04_nav_section_org_structure",
        items: [
          { href: "/m04/organizasyon/hiyerarsi", labelKey: "m04_nav_hierarchy" },
          { href: "/m04/organizasyon/vekalet", labelKey: "m04_nav_delegation" },
          { href: "/m04/organizasyon/unvanlar", labelKey: "m04_nav_job_titles" },
          { href: "/system/rbac", labelKey: "m04_nav_rbac_mappings" },
          { href: "/m04/organizasyon/birimler", labelKey: "m04_nav_org_units" },
        ],
      },
      {
        labelKey: "m04_nav_section_field_planning",
        items: [
          { href: "/m04/kadro/atama", labelKey: "m04_nav_event_assignment" },
          { href: "/m04/kadro/pozisyonlar", labelKey: "m04_nav_open_positions" },
          { href: "/m04/kadro/cakisma", labelKey: "m04_nav_conflict_check" },
          { href: "/m04/kadro/hak-edis", labelKey: "m04_nav_payroll_approval" },
          { href: "/m04/kadro/finans", labelKey: "m04_nav_finance_transfer" },
        ],
      },
    ],
  },
  m05: {
    titleKey: "module_name_m05",
    items: defaultSubnavItems("/modules/m05"),
  },
  m06: {
    titleKey: "module_name_m06",
    items: defaultSubnavItems("/modules/m06"),
  },
  m07: {
    titleKey: "module_name_m07",
    items: defaultSubnavItems("/modules/m07"),
  },
  m08: {
    titleKey: "module_name_m08",
    items: defaultSubnavItems("/modules/m08"),
  },
  m09: {
    titleKey: "module_name_m09",
    items: defaultSubnavItems("/modules/m09"),
  },
  m10: {
    titleKey: "module_name_m10",
    items: defaultSubnavItems("/modules/m10"),
  },
  m11: {
    titleKey: "module_name_m11",
    items: defaultSubnavItems("/modules/m11"),
  },
  m12: {
    titleKey: "module_name_m12",
    items: defaultSubnavItems("/modules/m12"),
  },
  peopleops: {
    titleKey: "peopleops_title",
    items: [
      { href: "/dashboard/peopleops", labelKey: "peopleops_overview" },
      { href: "/dashboard/peopleops/users", labelKey: "peopleops_users" },
      { href: "/dashboard/peopleops/rbac", labelKey: "peopleops_rbac" },
      { href: "/dashboard/peopleops/org", labelKey: "peopleops_org" },
      { href: "/hr/organization", labelKey: "hr_org_nav" },
      { href: "/hr/assignments", labelKey: "hr_assignments_nav" },
      { href: "/dashboard/peopleops/settings", labelKey: "peopleops_settings" },
    ],
  },
};


export function getModuleSubnavConfig(moduleId: string): ModuleSubnavConfig | null {
  return moduleSubnavConfig[moduleId] ?? null;
}
