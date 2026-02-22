import type { Metadata } from "next";

import { tr } from "@/i18n/tr";
import SettingsClient from "./SettingsClient";

export const metadata: Metadata = {
  title: tr.page_settings_title,
  description: tr.page_settings_description,
};

export default function SettingsPage() {
  return <SettingsClient />;
}
