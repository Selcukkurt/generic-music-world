"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { useI18n } from "@/i18n/LocaleProvider";

type ModuleRootClientProps = {
  code: string;
  nameKey: string;
};

export default function ModuleRootClient({
  code,
  nameKey,
}: ModuleRootClientProps) {
  const { t } = useI18n();

  return (
    <EmptyState
      title={`${code} - ${t(nameKey)}`}
      description={t("module_overview_description")}
    />
  );
}
