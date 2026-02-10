"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { useI18n } from "@/i18n/LocaleProvider";

type ModuleSectionClientProps = {
  nameKey: string;
  sectionLabelKey: string;
};

export default function ModuleSectionClient({
  nameKey,
  sectionLabelKey,
}: ModuleSectionClientProps) {
  const { t } = useI18n();

  return (
    <EmptyState
      title={`${t(sectionLabelKey)} - ${t(nameKey)}`}
      description={t("module_detail_description")}
    />
  );
}
