"use client";

import Image from "next/image";
import { useI18n } from "@/i18n/LocaleProvider";
import PageHeader from "@/components/shell/PageHeader";

export default function ProfileIdentity() {
  const { t } = useI18n();

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title={t("profile_menu_profile")}
        subtitle={t("profile_page_description")}
      />

      {/* Profile Card */}
      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6 backdrop-blur-sm">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-[var(--color-border)]">
            <Image
              src="/avatar-placeholder.svg"
              alt=""
              width={80}
              height={80}
              className="h-full w-full object-cover"
            />
          </div>
          <dl className="grid flex-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider ui-text-muted">
                {t("profile_label_full_name")}
              </dt>
              <dd className="mt-1 text-sm">{t("profile_user_name")}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider ui-text-muted">
                {t("profile_label_title")}
              </dt>
              <dd className="mt-1 text-sm">{t("profile_user_title")}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider ui-text-muted">
                {t("profile_label_email")}
              </dt>
              <dd className="mt-1 text-sm">{t("profile_user_email")}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider ui-text-muted">
                {t("profile_label_role")}
              </dt>
              <dd className="mt-1 text-sm">{t("profile_user_role")}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Secondary Section */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6 backdrop-blur-sm">
          <h3 className="text-sm font-semibold">{t("profile_section_security")}</h3>
          <p className="ui-text-muted mt-1 text-xs">
            {t("profile_section_placeholder")}
          </p>
        </div>
        <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6 backdrop-blur-sm">
          <h3 className="text-sm font-semibold">
            {t("profile_section_preferences")}
          </h3>
          <p className="ui-text-muted mt-1 text-xs">
            {t("profile_section_placeholder")}
          </p>
        </div>
      </div>
    </div>
  );
}
