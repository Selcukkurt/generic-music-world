"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase/client";
import GlobalHeader from "@/components/shell/GlobalHeader";
import AppSidebar from "@/components/shell/AppSidebar";
import ModuleRightPanel from "@/components/shell/ModuleRightPanel";
import ContentArea from "@/components/shell/ContentArea";
import AppFooter from "@/components/shell/AppFooter";
import { getModuleForPath } from "@/config/modules";
import { useI18n } from "@/i18n/LocaleProvider";
import { ShellUIProvider } from "@/context/ShellUIContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const activeModule = getModuleForPath(pathname);
  const isM01 = activeModule?.id === "m01";
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isModuleMenuCollapsed, setIsModuleMenuCollapsed] = useState(false);
  const { t } = useI18n();

  const effectiveSidebarCollapsed = activeModule ? true : isSidebarCollapsed;

  useEffect(() => {
    const checkAccess = async () => {
      const { data } = await supabaseBrowser.auth.getUser();

      if (!data.user) {
        router.replace("/login");
        return;
      }

      const hasAccess = true;
      if (!hasAccess) {
        router.replace("/forbidden");
        return;
      }

      setIsChecking(false);
    };

    checkAccess();
  }, [router]);

  if (isChecking) {
    return (
      <div className="ui-page flex min-h-[100dvh] items-center justify-center">
        <img
          src="/brand-loader.gif"
          alt={t("common_loading")}
          className="h-16 w-16"
        />
      </div>
    );
  }

  return (
    <ShellUIProvider>
      <div className="ui-page flex min-h-screen min-h-[100dvh] flex-col overflow-x-hidden">
        <GlobalHeader
          showMenuButton
          menuLabel={t("header_menu")}
          showModuleMenuButton={isM01}
        />

        <div className="flex min-h-0 flex-1">
          <AppSidebar
            collapsed={effectiveSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          />
          <div
            className={`flex min-h-0 flex-1 flex-col px-4 py-6 transition-[margin] duration-200 sm:px-6 lg:px-8 ${
              effectiveSidebarCollapsed ? "lg:ml-14" : "lg:ml-56"
            } ${isM01 ? (isModuleMenuCollapsed ? "lg:mr-14" : "lg:mr-80") : ""}`}
          >
            <ContentArea className="min-h-0 flex-1 ui-fade-slide ui-section">
              {children}
            </ContentArea>
          </div>
          {isM01 ? (
            <ModuleRightPanel
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
