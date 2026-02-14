"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { coreItems, personalItems, type SidebarNavItem } from "@/config/sidebar";
import { useI18n } from "@/i18n/LocaleProvider";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useShellUI } from "@/context/ShellUIContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { canAccess } from "@/lib/rbac/canAccess";

type AppSidebarProps = {
  collapsed: boolean;
  onToggleCollapse: () => void;
};

const IconDashboard = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="3" y="3" width="7" height="9" rx="1" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="14" y="3" width="7" height="5" rx="1" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="14" y="12" width="7" height="9" rx="1" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="3" y="16" width="7" height="5" rx="1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconUser = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="12" cy="8" r="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 20a7 7 0 0 1 14 0" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconChevron = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const iconMap = {
  core: IconDashboard,
  personal: IconUser,
} as const;

function NavIcon({ icon }: { icon: SidebarNavItem["icon"] }) {
  const C = iconMap[icon];
  return <C className="h-4 w-4 shrink-0" />;
}

function SidebarSection({
  titleKey,
  items,
  collapsed,
  isActive,
  onClose,
  t,
}: {
  titleKey: string;
  items: SidebarNavItem[];
  collapsed: boolean;
  isActive: (href: string) => boolean;
  onClose: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className="space-y-1">
      {!collapsed && (
        <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider ui-text-muted">
          {t(titleKey)}
        </p>
      )}
      <nav className="space-y-0.5">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
              isActive(item.href)
                ? "bg-[var(--color-surface2)] text-[var(--color-text)]"
                : "ui-text-secondary hover:bg-[var(--color-surface-hover)]"
            }`}
            onClick={onClose}
          >
            <NavIcon icon={item.icon} />
            {!collapsed && <span>{t(item.labelKey)}</span>}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function filterByAccess(
  items: SidebarNavItem[],
  role: "owner" | "admin" | "staff" | "viewer" | null
): SidebarNavItem[] {
  if (!role) return items;
  return items.filter((item) => {
    if (item.resource == null || item.action == null) return true;
    return canAccess(role, item.resource, item.action);
  });
}

export default function AppSidebar({
  collapsed,
  onToggleCollapse,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { sidebarOpen, closeSidebar } = useShellUI();
  const { user } = useCurrentUser();
  const sidebarRef = useRef<HTMLElement>(null);

  const role = user?.role ?? null;
  const filteredCoreItems = filterByAccess(coreItems, role);
  const filteredPersonalItems = filterByAccess(personalItems, role);

  useBodyScrollLock(sidebarOpen);
  useFocusTrap(sidebarRef, sidebarOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSidebar();
    };
    if (sidebarOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [sidebarOpen, closeSidebar]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (sidebarRef.current && target && !sidebarRef.current.contains(target)) {
        closeSidebar();
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [sidebarOpen, closeSidebar]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));

  return (
    <>
      <button
        type="button"
        aria-label={t("sidebar_close")}
        onClick={closeSidebar}
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition lg:hidden ${
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!sidebarOpen}
      />
      <aside
        ref={sidebarRef}
        aria-label={t("sidebar_core")}
        className={`fixed left-0 top-[var(--header-height)] z-50 flex h-[calc(100dvh-var(--header-height))] flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-[width,transform] duration-200 ${
          collapsed ? "w-[56px]" : "w-56"
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        style={{ marginTop: 0 }}
      >
        <div className="flex h-full flex-col overflow-y-auto py-4">
          <div className="flex flex-col gap-6 px-2">
            <SidebarSection
              titleKey="shell_core"
              items={filteredCoreItems}
              collapsed={collapsed}
              isActive={isActive}
              onClose={closeSidebar}
              t={t}
            />
            <div className="border-t border-[var(--color-border)]" />
            <SidebarSection
              titleKey="shell_personal"
              items={filteredPersonalItems}
              collapsed={collapsed}
              isActive={isActive}
              onClose={closeSidebar}
              t={t}
            />
          </div>
        </div>
        <div className="mt-auto border-t border-[var(--color-border)] p-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm ui-text-muted transition hover:bg-[var(--color-surface-hover)]"
            aria-label={collapsed ? t("sidebar_expand") : t("sidebar_collapse")}
          >
            <IconChevron className={`h-4 w-4 shrink-0 ${collapsed ? "" : "rotate-180"}`} />
            {!collapsed && <span>{t("sidebar_collapse")}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
