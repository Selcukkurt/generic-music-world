"use client";

import Link from "next/link";

import { modules } from "@/config/modules";
import { useI18n } from "@/i18n/LocaleProvider";

export default function DashboardHomeClient() {
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="w-full max-w-4xl">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.2em] ui-text-secondary">
            {t("home_modules_label")}
          </p>
          <h1 className="mt-2 text-3xl font-semibold">{t("home_title")}</h1>
          <p className="ui-text-muted mt-2 text-sm">{t("home_subtitle")}</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {modules.map((module) => (
            <Link
              key={module.id}
              href={module.basePath}
              className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_18px_40px_rgba(7,16,35,0.4)] transition duration-200 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_22px_60px_rgba(245,197,66,0.18)]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] ui-text-secondary">
                    {module.code}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">
                    {t(module.nameKey)}
                  </h2>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] text-sm ui-text-secondary transition group-hover:text-white">
                  →
                </div>
              </div>
              <p className="ui-text-muted mt-4 text-sm">
                {t("home_card_description")}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
