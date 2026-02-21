"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  coreItems,
  personalItems,
  systemItems,
  type SidebarNavItem,
  type SidebarIconType,
  type SystemSidebarNavItem,
} from "@/config/sidebar";
import { useI18n } from "@/i18n/LocaleProvider";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useShellUI } from "@/context/ShellUIContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { canAccess, canAccessSystem } from "@/lib/rbac/canAccess";
import type { Role } from "@/lib/rbac/types";

/**
 * Strict active check: only one sidebar item can be active.
 * Active if pathname === itemPath OR pathname starts with itemPath + "/"
 */
function isSidebarItemActive(itemPath: string, pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === itemPath || pathname.startsWith(itemPath + "/");
}

/** Set true to log tooltip hover/collapsed state in console (dev only) */
const DEBUG_SIDEBAR_TOOLTIP = false;

type AppSidebarProps = {
  collapsed: boolean;
  onToggleCollapse: () => void;
};

const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const IconHome = ({ className }: { className?: string }) => (
  <svg className={className} {...svgProps}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const IconAtom = ({ className }: { className?: string }) => (
  <svg className={className} {...svgProps}>
    <circle cx="12" cy="12" r="1" />
    <path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5z" />
    <path d="M3.8 3.8c-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5 2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5z" />
  </svg>
);

const IconActivity = ({ className }: { className?: string }) => (
  <svg className={className} {...svgProps}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const IconFileText = ({ className }: { className?: string }) => (
  <svg className={className} {...svgProps}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const IconBell = ({ className }: { className?: string }) => (
  <svg className={className} {...svgProps}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const IconUser = ({ className }: { className?: string }) => (
  <svg className={className} {...svgProps}>
    <circle cx="12" cy="8" r="3" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </svg>
);

const IconCheckCircle = ({ className }: { className?: string }) => (
  <svg className={className} {...svgProps}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const IconCalendar = ({ className }: { className?: string }) => (
  <svg className={className} {...svgProps}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconTarget = ({ className }: { className?: string }) => (
  <svg className={className} {...svgProps}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const IconUsers = ({ className }: { className?: string }) => (
  <svg className={className} {...svgProps}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconMessageSquare = ({ className }: { className?: string }) => (
  <svg className={className} {...svgProps}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const IconSettings = ({ className }: { className?: string }) => (
  <svg className={className} {...svgProps}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const IconChevron = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const iconTypeMap: Record<SidebarIconType, React.ComponentType<{ className?: string }>> = {
  home: IconHome,
  atom: IconAtom,
  activity: IconActivity,
  "file-text": IconFileText,
  bell: IconBell,
  user: IconUser,
  "check-circle": IconCheckCircle,
  calendar: IconCalendar,
  target: IconTarget,
  users: IconUsers,
  "message-square": IconMessageSquare,
  settings: IconSettings,
};

function NavIcon({ iconType }: { iconType: SidebarIconType }) {
  const C = iconTypeMap[iconType];
  return <C className="h-4 w-4 shrink-0" />;
}

function SidebarTooltip({
  children,
  label,
  collapsed,
}: {
  children: React.ReactNode;
  label: string;
  collapsed: boolean;
}) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = useCallback(() => {
    if (DEBUG_SIDEBAR_TOOLTIP) {
      console.log("[SidebarTooltip] mouseEnter, collapsed:", collapsed, "label:", label);
    }
    const el = triggerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      setPosition({
        top: rect.top + rect.height / 2,
        left: rect.right + 8,
      });
    }
  }, [collapsed, label]);

  const handleMouseLeave = useCallback(() => {
    setPosition(null);
  }, []);

  if (!collapsed) return <>{children}</>;

  const tooltipEl =
    typeof document !== "undefined" && position ? (
      createPortal(
        <span
          role="tooltip"
          className="pointer-events-none fixed z-[9999] whitespace-nowrap rounded-md border border-[var(--color-border)] bg-[var(--color-surface2)] px-2.5 py-1.5 text-xs text-[var(--color-text)] shadow-lg"
          style={{
            top: position.top,
            left: position.left,
            transform: "translateY(-50%)",
            animation: "sidebarTooltipFade 150ms ease-out",
          }}
        >
          {label}
        </span>,
        document.body
      )
    ) : null;

  return (
    <div
      ref={triggerRef}
      className="relative flex min-h-[44px] w-full items-center justify-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {tooltipEl}
    </div>
  );
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
  items: (SidebarNavItem | SystemSidebarNavItem)[];
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
          <SidebarTooltip key={item.href} label={t(item.labelKey)} collapsed={collapsed}>
            <Link
              href={item.href}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                collapsed ? "justify-center" : ""
              } ${
                isActive(item.href)
                  ? "bg-[var(--color-surface2)] text-[var(--color-text)]"
                  : "ui-text-secondary hover:bg-[var(--color-surface-hover)]"
              }`}
              onClick={onClose}
            >
              <NavIcon iconType={item.iconType} />
              {!collapsed && <span>{t(item.labelKey)}</span>}
            </Link>
          </SidebarTooltip>
        ))}
      </nav>
    </div>
  );
}

function filterByAccess(
  items: SidebarNavItem[],
  role: Role | null
): SidebarNavItem[] {
  if (!role) return items;
  return items.filter((item) => {
    if ("systemOnly" in item && item.systemOnly) return canAccessSystem(role);
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
  const showSystemSection = canAccessSystem(role);

  useEffect(() => {
    if (DEBUG_SIDEBAR_TOOLTIP) {
      console.log("[AppSidebar] collapsed:", collapsed);
    }
  }, [collapsed]);

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

  const isActive = (href: string) => isSidebarItemActive(href, pathname);

  return (
    <>
      <style>{`@keyframes sidebarTooltipFade{from{opacity:0}to{opacity:1}}`}</style>
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
            {showSystemSection && (
              <>
                <div className="border-t border-[var(--color-border)]" />
                <SidebarSection
                  titleKey="shell_system"
                  items={systemItems}
                  collapsed={collapsed}
                  isActive={isActive}
                  onClose={closeSidebar}
                  t={t}
                />
              </>
            )}
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
