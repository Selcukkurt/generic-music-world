"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { useI18n } from "@/i18n/LocaleProvider";

export default function CalendarPage() {
  const { t } = useI18n();

  return (
    <EmptyState
      title={t("placeholder_calendar_title")}
      description={t("placeholder_calendar_description")}
    />
  );
}
