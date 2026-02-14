import type { Metadata } from "next";

import PageSlot from "@/components/shell/PageSlot";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: tr.page_settings_title,
};

export default function SettingsPage() {
  return (
    <PageSlot
      title={tr.shell_page_title}
      subtitle={tr.shell_page_subtitle}
    />
  );
}
