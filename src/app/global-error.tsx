"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/ui/ErrorState";
import { getLocale, setCurrentLocale, t } from "@/i18n";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const locale = getLocale();

  useEffect(() => {
    setCurrentLocale(locale);
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <html lang={locale}>
      <body className="ui-page flex min-h-[100dvh] items-center justify-center px-6">
        <div className="w-full max-w-md">
          <ErrorState
            title={t("global_error_title", locale)}
            message={t("global_error_message", locale)}
            helper={error.message}
            actionLabel={t("global_error_retry", locale)}
            onAction={reset}
          />
        </div>
      </body>
    </html>
  );
}
