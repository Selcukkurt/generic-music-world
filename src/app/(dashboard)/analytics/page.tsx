import type { Metadata } from "next";

import PlaceholderPageClient from "../PlaceholderPageClient";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: tr.page_analytics_title,
};

export default function AnalyticsPage() {
  return (
    <PlaceholderPageClient
      titleKey="page_analytics_title"
      descriptionKey="page_analytics_description"
    />
  );
}
