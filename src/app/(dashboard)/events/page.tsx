import type { Metadata } from "next";

import PlaceholderPageClient from "../PlaceholderPageClient";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: tr.page_events_title,
};

export default function EventsPage() {
  return (
    <PlaceholderPageClient
      titleKey="page_events_title"
      descriptionKey="page_events_description"
    />
  );
}
