export type ModuleMenuItem = {
  id: string;
  labelKey: string;
  href: string;
};

export type ModuleStatus = "active" | "in_progress" | "planned";

export type AppModule = {
  id: string;
  code: string;
  nameKey: string;
  /** Display name for dashboard card (e.g. "Katılımcı ve Bilet Operasyonları") */
  displayName: string;
  /** Short code in parentheses (e.g. "BiletOps") */
  shortCode: string;
  basePath: string;
  menuItems: ModuleMenuItem[];
  status: ModuleStatus;
  progress: number;
  summaryKey: string;
  purposeKey: string;
};

const buildMenuItems = (code: string, basePath: string): ModuleMenuItem[] => [
  {
    id: `${code}-01`,
    labelKey: `module_tab_${code.toLowerCase()}_01`,
    href: `${basePath}/01`,
  },
  {
    id: `${code}-02`,
    labelKey: `module_tab_${code.toLowerCase()}_02`,
    href: `${basePath}/02`,
  },
  {
    id: `${code}-03`,
    labelKey: `module_tab_${code.toLowerCase()}_03`,
    href: `${basePath}/03`,
  },
];

const moduleMeta = (
  id: string,
  code: string,
  nameKey: string,
  displayName: string,
  shortCode: string,
  basePath: string,
  status: "active" | "in_progress" | "planned",
  progress: number,
  summaryKey: string,
  purposeKey: string
): AppModule => ({
  id,
  code,
  nameKey,
  displayName,
  shortCode,
  basePath,
  menuItems: buildMenuItems(code, basePath),
  status,
  progress,
  summaryKey,
  purposeKey,
});

export const modules: AppModule[] = [
  moduleMeta("m01", "M01", "module_name_m01", "Katılımcı ve Bilet Operasyonları", "BiletOps", "/m01", "active", 100, "module_summary_m01", "module_purpose_m01"),
  moduleMeta("m02", "M02", "module_name_m02", "Etkinlik Operasyonları", "EtkinlikOps", "/m02", "in_progress", 45, "module_summary_m02", "module_purpose_m02"),
  moduleMeta("m03", "M03", "module_name_m03", "Finans ve Muhasebe Operasyonları", "FinansOps", "/m03", "planned", 0, "module_summary_m03", "module_purpose_m03"),
  moduleMeta("m04", "M04", "module_name_m04", "İK ve Organizasyon Operasyonları", "PeopleOps", "/m04", "planned", 0, "module_summary_m04", "module_purpose_m04"),
  moduleMeta("m05", "M05", "module_name_m05", "Pazarlama ve İletişim Operasyonları", "MarketingOps", "/m05", "planned", 0, "module_summary_m05", "module_purpose_m05"),
  moduleMeta("m06", "M06", "module_name_m06", "Kurumsal İlişkiler ve Sponsorluk Operasyonları", "CorporateOps", "/m06", "planned", 0, "module_summary_m06", "module_purpose_m06"),
  moduleMeta("m07", "M07", "module_name_m07", "Kreatif Operasyonları", "GMS – KreatifOps", "/m07", "planned", 0, "module_summary_m07", "module_purpose_m07"),
  moduleMeta("m08", "M08", "module_name_m08", "Dahili Biletleme Modülü", "InternalTicketing", "/m08", "planned", 0, "module_summary_m08", "module_purpose_m08"),
  moduleMeta("m09", "M09", "module_name_m09", "Veri ve Analiz Operasyonları", "BI-Ops", "/m09", "planned", 0, "module_summary_m09", "module_purpose_m09"),
  moduleMeta("m10", "M10", "module_name_m10", "Yönetim ve Strateji Operasyonları", "ManagementOps", "/m10", "planned", 0, "module_summary_m10", "module_purpose_m10"),
  moduleMeta("m11", "M11", "module_name_m11", "Web Sitesi ve İçerik Yönetimi", "WebOps", "/m11", "planned", 0, "module_summary_m11", "module_purpose_m11"),
  moduleMeta("m12", "M12", "module_name_m12", "Sanatçı ve Ajans Operasyonları", "GMA-Ops", "/m12", "planned", 0, "module_summary_m12", "module_purpose_m12"),
];

export const getModuleForPath = (pathname: string | null) => {
  if (!pathname) return null;
  return (
    modules.find((module) => pathname === module.basePath) ??
    modules.find((module) => pathname.startsWith(`${module.basePath}/`)) ??
    null
  );
};

/** M01–M12 (12 modules for dashboard quick access). */
export const modulesM01ToM12 = modules.filter((m) =>
  ["m01", "m02", "m03", "m04", "m05", "m06", "m07", "m08", "m09", "m10", "m11", "m12"].includes(m.id)
);
