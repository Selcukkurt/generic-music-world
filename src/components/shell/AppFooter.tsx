"use client";

import { useI18n } from "@/i18n/LocaleProvider";

export default function AppFooter() {
  const { t } = useI18n();

  return (
    <footer className="shrink-0 py-4 text-center">
      <p className="text-xs opacity-40 ui-text-muted">
        {t("footer_copyright")}
      </p>
    </footer>
  );
}
