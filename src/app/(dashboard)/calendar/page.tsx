import type { Metadata } from "next";

import CalendarClient from "./CalendarClient";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: tr.shell_personal_item_3,
};

export default function CalendarPage() {
  return <CalendarClient />;
}
