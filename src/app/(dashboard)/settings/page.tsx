import type { Metadata } from "next";

import PlaceholderPageClient from "../PlaceholderPageClient";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: tr.page_settings_title,
};

export default function SettingsPage() {
  return (
    <PlaceholderPageClient
      titleKey="page_settings_title"
      descriptionKey="page_settings_description"
    />
  );
}
