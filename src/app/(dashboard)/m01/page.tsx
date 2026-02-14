import type { Metadata } from "next";

import PageSlot from "@/components/shell/PageSlot";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: tr.module_name_m01,
};

export default function M01Page() {
  return (
    <PageSlot
      title={tr.shell_page_title}
      subtitle={tr.shell_page_subtitle}
    />
  );
}
