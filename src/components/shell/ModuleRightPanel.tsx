"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { getModuleSubnavConfig } from "@/config/module-subnav";
import { useI18n } from "@/i18n/LocaleProvider";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useShellUI } from "@/context/ShellUIContext";

const IconChevron = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 6l6 6-6 6" />
  </svg>
);

type ModuleRightPanelProps = {
  moduleId: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

const STORAGE_KEY = "gmw_module_menu_collapsed";

/** Right context slot. Visible on /m0x/* routes. On mobile: slide-in overlay. */
export default function ModuleRightPanel({
  moduleId,
  collapsed = false,
  onToggleCollapse,
}: ModuleRightPanelProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { modulePanelOpen, closeModulePanel } = useShellUI();
  const panelRef = useRef<HTMLElement>(null);
  const config = getModuleSubnavConfig(moduleId);
  const items = config?.items ?? [];

  useBodyScrollLock(modulePanelOpen);
  useFocusTrap(panelRef, modulePanelOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modulePanelOpen) closeModulePanel();
    };
    if (modulePanelOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [modulePanelOpen, closeModulePanel]);

  useEffect(() => {
    if (!modulePanelOpen) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (panelRef.current && target && !panelRef.current.contains(target)) {
        const backdrop = document.querySelector("[data-module-panel-backdrop]");
        if (backdrop?.contains(target)) closeModulePanel();
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [modulePanelOpen, closeModulePanel]);

  const isActive = (item: { href: string }) =>
    pathname === item.href || (pathname?.startsWith(`${item.href}/`) ?? false);

  return (
    <>
      <button
        type="button"
        aria-label={t("sidebar_close")}
        onClick={closeModulePanel}
        data-module-panel-backdrop
        className={`fixed inset-0 z-40 bg-black/40 transition lg:hidden ${
          modulePanelOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!modulePanelOpen}
      />
      <aside
        ref={panelRef}
        aria-label={t("shell_context_module_label")}
        className={`ui-glass fixed right-0 top-[var(--header-height)] z-50 flex h-[calc(100dvh-var(--header-height))] flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm transition-[width,transform] duration-200 ease-out ${
          collapsed ? "w-14" : "w-80"
        } ${modulePanelOpen ? "translate-x-0" : "-translate-x-full"} ${
          modulePanelOpen ? "flex" : "hidden"
        } lg:flex lg:translate-x-0`}
        style={{ boxShadow: "-4px 0 24px rgba(0,0,0,0.15)" }}
      >
        <div className="flex flex-1 flex-col overflow-y-auto p-3">
          {!collapsed && (
            <>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider ui-text-muted">
                  {t("shell_context_module_label")}
                </p>
                <p className="mt-0.5 text-sm font-medium text-[var(--color-text)]">
                  {config?.titleKey ? t(config.titleKey) : t("shell_context_module_title")}
                </p>
              </div>
              <nav className="mt-4 space-y-0.5">
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-lg px-3 py-2 text-sm transition ${
                      isActive(item)
                        ? "bg-[var(--color-surface2)] text-[var(--color-text)]"
                        : "ui-text-secondary hover:bg-[var(--color-surface-hover)]"
                    }`}
                  >
                    {t(item.labelKey)}
                  </Link>
                ))}
              </nav>
            </>
          )}
          {collapsed && (
            <nav className="flex flex-col items-center gap-1">
              {items.map((item, idx) => (
                <Link
                  key={item.href}
                  href={item.href}
                  title={t(item.labelKey)}
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition ${
                    isActive(item)
                      ? "bg-[var(--color-surface2)] text-[var(--color-text)]"
                      : "ui-text-secondary hover:bg-[var(--color-surface-hover)]"
                  }`}
                >
                  <span className="text-xs font-medium">{idx + 1}</span>
                </Link>
              ))}
            </nav>
          )}
        </div>
        <div className="shrink-0 border-t border-[var(--color-border)] p-2">
          <button
            type="button"
            onClick={onToggleCollapse ?? (() => {})}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs ui-text-muted transition hover:bg-[var(--color-surface-hover)]"
            aria-label={collapsed ? t("module_menu_expand") : t("module_menu_collapse")}
            title={collapsed ? t("module_menu_expand") : t("module_menu_collapse")}
          >
            <IconChevron
              className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ease-out ${
                collapsed ? "rotate-180" : ""
              }`}
            />
            {!collapsed && (
              <span className="opacity-80">{t("module_menu_collapse")}</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
