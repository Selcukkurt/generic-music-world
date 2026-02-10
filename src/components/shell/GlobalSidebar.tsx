"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { modules } from "@/config/modules";
import { useI18n } from "@/i18n/LocaleProvider";

type GlobalSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function GlobalSidebar({ isOpen, onClose }: GlobalSidebarProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <>
      <button
        type="button"
        aria-label={t("sidebar_close")}
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition lg:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-[var(--color-border)] bg-[var(--color-surface)] transition lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col gap-2 px-3 py-4">
          <div className="px-3 text-xs font-semibold uppercase tracking-wide ui-text-secondary">
            {t("sidebar_modules_title")}
          </div>
          <nav className="space-y-1">
            {modules.map((module) => {
              const isActive =
                pathname === module.basePath ||
                (pathname?.startsWith(`${module.basePath}/`) ?? false);
              return (
                <Link
                  key={module.id}
                  href={module.basePath}
                  className={`block rounded-md px-3 py-2 text-sm transition ${
                    isActive
                      ? "bg-slate-800 text-white"
                      : "ui-text-secondary hover:bg-slate-900"
                  }`}
                  onClick={onClose}
                >
                  <span className="text-xs tracking-[0.18em] ui-text-muted">
                    {module.code}
                  </span>
                  <span className="ml-2">{t(module.nameKey)}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
