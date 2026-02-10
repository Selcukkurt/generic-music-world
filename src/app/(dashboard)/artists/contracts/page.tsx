"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { useI18n } from "@/i18n/LocaleProvider";

export default function ArtistContractsPage() {
  const { t } = useI18n();

  return (
    <EmptyState
      title={t("placeholder_artist_contracts_title")}
      description={t("placeholder_artist_contracts_description")}
    />
  );
}
