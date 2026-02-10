"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { useI18n } from "@/i18n/LocaleProvider";

export default function ArtistRevenuePage() {
  const { t } = useI18n();

  return (
    <EmptyState
      title={t("placeholder_artist_revenue_title")}
      description={t("placeholder_artist_revenue_description")}
    />
  );
}
