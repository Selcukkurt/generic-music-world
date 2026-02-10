"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { useI18n } from "@/i18n/LocaleProvider";

export default function ArtistsPage() {
  const { t } = useI18n();

  return (
    <EmptyState
      title={t("placeholder_artists_title")}
      description={t("placeholder_artists_description")}
    />
  );
}
