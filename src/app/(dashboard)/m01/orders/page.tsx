import type { Metadata } from "next";

import PageSlot from "@/components/shell/PageSlot";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: tr.m01_orders_title,
};

export default function M01OrdersPage() {
  return (
    <PageSlot
      title={tr.m01_orders_title}
      subtitle={tr.shell_page_subtitle}
    />
  );
}
