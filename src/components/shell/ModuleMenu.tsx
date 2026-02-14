"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getModuleForPath } from "@/config/modules";
import { useI18n } from "@/i18n/LocaleProvider";

export default function ModuleMenu() {
  const pathname = usePathname();
  const activeModule = getModuleForPath(pathname);
  const items = activeModule?.menuItems ?? [];
  const { t } = useI18n();

  if (!activeModule) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex sm:flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] ui-text-secondary">
              {activeModule.code}
            </span>
            <span className="text-xs">{t(activeModule.nameKey)}</span>
          </div>
          <div className="flex-1 overflow-x-auto">
            <nav className="flex items-center gap-2">
              {items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`whitespace-nowrap rounded-full px-4 py-1 text-xs transition ${
                      isActive
                        ? "bg-[var(--color-surface2)] text-[var(--color-text)]"
                        : "ui-text-secondary hover:bg-[var(--color-surface-hover)]"
                    }`}
                  >
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
