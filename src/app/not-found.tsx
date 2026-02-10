"use client";

import Link from "next/link";

import { ErrorState } from "@/components/ui/ErrorState";
import { useI18n } from "@/i18n/LocaleProvider";

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div className="ui-page flex min-h-[100dvh] items-center justify-center px-6">
      <div className="w-full max-w-md space-y-4">
        <ErrorState
          title={t("notfound_title")}
          message={t("notfound_message")}
        />
        <Link
          href="/login"
          className="ui-button-primary block px-4 py-2 text-center text-sm font-semibold"
        >
          {t("notfound_back")}
        </Link>
      </div>
    </div>
  );
}
