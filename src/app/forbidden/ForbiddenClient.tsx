"use client";

import { ErrorState } from "@/components/ui/ErrorState";
import { useI18n } from "@/i18n/LocaleProvider";

export default function ForbiddenClient() {
  const { t } = useI18n();

  return (
    <div className="ui-page flex min-h-[100dvh] items-center justify-center px-6">
      <div className="w-full max-w-md">
        <ErrorState
          title={t("forbidden_title")}
          message={t("forbidden_message")}
          helper={t("forbidden_helper")}
        />
      </div>
    </div>
  );
}
