import type { Metadata } from "next";

import PageSlot from "@/components/shell/PageSlot";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: `${tr.module_name_m02} - ${tr.sidebar_sub_reports}`,
};

export default function M02ReportsPage() {
  return (
    <PageSlot
      title={tr.sidebar_sub_reports}
      subtitle={tr.module_summary_m02}
    />
  );
}
