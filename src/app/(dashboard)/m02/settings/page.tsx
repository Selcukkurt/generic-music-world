import type { Metadata } from "next";

import PageSlot from "@/components/shell/PageSlot";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: `${tr.module_name_m02} - ${tr.sidebar_sub_settings}`,
};

export default function M02SettingsPage() {
  return (
    <PageSlot
      title={tr.sidebar_sub_settings}
      subtitle={tr.module_summary_m02}
    />
  );
}
