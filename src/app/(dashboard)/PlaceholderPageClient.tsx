"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { useI18n } from "@/i18n/LocaleProvider";

type PlaceholderPageClientProps = {
  titleKey: string;
  descriptionKey: string;
};

export default function PlaceholderPageClient({
  titleKey,
  descriptionKey,
}: PlaceholderPageClientProps) {
  const { t } = useI18n();

  return (
    <EmptyState
      title={t(titleKey)}
      description={t(descriptionKey)}
    />
  );
}
