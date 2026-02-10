export type ModuleMenuItem = {
  id: string;
  labelKey: string;
  href: string;
};

export type AppModule = {
  id: string;
  code: string;
  nameKey: string;
  basePath: string;
  menuItems: ModuleMenuItem[];
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

export const modules: AppModule[] = [
  {
    id: "m01",
    code: "M01",
    nameKey: "module_name_m01",
    basePath: "/m01",
    menuItems: buildMenuItems("M01", "/m01"),
  },
  {
    id: "m02",
    code: "M02",
    nameKey: "module_name_m02",
    basePath: "/m02",
    menuItems: buildMenuItems("M02", "/m02"),
  },
  {
    id: "m03",
    code: "M03",
    nameKey: "module_name_m03",
    basePath: "/m03",
    menuItems: buildMenuItems("M03", "/m03"),
  },
  {
    id: "m04",
    code: "M04",
    nameKey: "module_name_m04",
    basePath: "/m04",
    menuItems: buildMenuItems("M04", "/m04"),
  },
  {
    id: "m05",
    code: "M05",
    nameKey: "module_name_m05",
    basePath: "/m05",
    menuItems: buildMenuItems("M05", "/m05"),
  },
  {
    id: "m06",
    code: "M06",
    nameKey: "module_name_m06",
    basePath: "/m06",
    menuItems: buildMenuItems("M06", "/m06"),
  },
  {
    id: "m07",
    code: "M07",
    nameKey: "module_name_m07",
    basePath: "/m07",
    menuItems: buildMenuItems("M07", "/m07"),
  },
  {
    id: "m08",
    code: "M08",
    nameKey: "module_name_m08",
    basePath: "/m08",
    menuItems: buildMenuItems("M08", "/m08"),
  },
  {
    id: "m09",
    code: "M09",
    nameKey: "module_name_m09",
    basePath: "/m09",
    menuItems: buildMenuItems("M09", "/m09"),
  },
  {
    id: "m10",
    code: "M10",
    nameKey: "module_name_m10",
    basePath: "/m10",
    menuItems: buildMenuItems("M10", "/m10"),
  },
  {
    id: "m11",
    code: "M11",
    nameKey: "module_name_m11",
    basePath: "/m11",
    menuItems: buildMenuItems("M11", "/m11"),
  },
];

export const getModuleForPath = (pathname: string | null) => {
  if (!pathname) return null;
  return (
    modules.find((module) => pathname === module.basePath) ??
    modules.find((module) => pathname.startsWith(`${module.basePath}/`)) ??
    null
  );
};
