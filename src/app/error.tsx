"use client";

import { ErrorState } from "@/components/ui/ErrorState";
import { useI18n } from "@/i18n/LocaleProvider";

export default function RootError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="ui-page flex min-h-[100dvh] items-center justify-center px-6">
      <div className="w-full max-w-md">
        <ErrorState
          title={t("error_title")}
          message={t("error_message")}
          helper={error.message}
          actionLabel={t("error_retry")}
          onAction={reset}
        />
      </div>
    </div>
  );
}
