"use client";

import PageHeader from "@/components/shell/PageHeader";
import { useI18n } from "@/i18n/LocaleProvider";

export default function PeopleOpsOrgPage() {
  const { t } = useI18n();
  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title={t("peopleops_org")}
        subtitle="Organizasyon yapısı ve birimler"
      />
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 text-center ui-text-muted">
        Organizasyon – Yakında
      </div>
    </div>
  );
}
