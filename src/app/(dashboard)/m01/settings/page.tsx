import type { Metadata } from "next";

import PageSlot from "@/components/shell/PageSlot";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: tr.m01_settings_title,
};

export default function M01SettingsPage() {
  return (
    <PageSlot
      title={tr.m01_settings_title}
      subtitle={tr.shell_page_subtitle}
    />
  );
}
