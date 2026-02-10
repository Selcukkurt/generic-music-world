import type { Metadata } from "next";

import DashboardHomeClient from "../DashboardHomeClient";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: tr.meta_dashboard_title,
};

export default function DashboardPage() {
  return <DashboardHomeClient />;
}
