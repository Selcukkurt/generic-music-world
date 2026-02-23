import type { Metadata } from "next";

import PageSlot from "@/components/shell/PageSlot";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: tr.m01_campaigns_title,
};

export default function M01CampaignsPage() {
  return (
    <PageSlot
      title={tr.m01_campaigns_title}
      subtitle={tr.m01_page_subtitle}
    />
  );
}
