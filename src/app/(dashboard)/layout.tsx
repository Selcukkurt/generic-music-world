"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";

import GlobalHeader from "@/components/shell/GlobalHeader";
import AppSidebar from "@/components/shell/AppSidebar";
import ModuleRightPanel from "@/components/shell/ModuleRightPanel";
import ContentArea from "@/components/shell/ContentArea";
import AppFooter from "@/components/shell/AppFooter";
import { getModuleForPath } from "@/config/modules";
import { useI18n } from "@/i18n/LocaleProvider";
import { ShellUIProvider } from "@/context/ShellUIContext";
import { useAccessGate } from "@/hooks/useAccessGate";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isChecking } = useAccessGate();
  const activeModule = getModuleForPath(pathname);
  const isInModule = !!activeModule;
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isModuleMenuCollapsed, setIsModuleMenuCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("gmw_module_menu_collapsed");
      queueMicrotask(() => {
        if (stored === "true") setIsModuleMenuCollapsed(true);
        else if (stored === "false") setIsModuleMenuCollapsed(false);
      });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("gmw_module_menu_collapsed", String(isModuleMenuCollapsed));
    } catch {
      /* ignore */
    }
  }, [isModuleMenuCollapsed]);
  const { t } = useI18n();

  const effectiveSidebarCollapsed = activeModule ? true : isSidebarCollapsed;

  if (isChecking) {
    return (
      <div className="ui-page flex min-h-[100dvh] items-center justify-center">
        <Image
          src="/brand-loader.gif"
          alt={t("common_loading")}
          width={64}
          height={64}
          className="h-16 w-16"
        />
      </div>
    );
  }

  return (
    <ShellUIProvider>
      <div className="ui-page flex min-h-screen min-h-[100dvh] flex-col overflow-x-visible">
        <GlobalHeader
          showMenuButton
          menuLabel={t("header_menu")}
          showModuleMenuButton={isInModule}
        />

        <div className="flex min-h-0 flex-1">
          <AppSidebar
            collapsed={effectiveSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          />
          <div
            className={`flex min-h-0 flex-1 flex-col px-4 py-6 transition-[margin] duration-200 sm:px-6 lg:px-8 ${
              effectiveSidebarCollapsed ? "lg:ml-14" : "lg:ml-56"
            } ${isInModule ? (isModuleMenuCollapsed ? "lg:mr-14" : "lg:mr-80") : ""}`}
          >
            <ContentArea className="min-h-0 flex-1 ui-fade-slide ui-section">
              {children}
            </ContentArea>
          </div>
          {activeModule ? (
            <ModuleRightPanel
              moduleId={activeModule.id}
              collapsed={isModuleMenuCollapsed}
              onToggleCollapse={() => setIsModuleMenuCollapsed((prev) => !prev)}
            />
          ) : null}
        </div>

        <AppFooter />
      </div>
    </ShellUIProvider>
  );
}
