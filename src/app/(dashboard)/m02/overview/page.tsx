import type { Metadata } from "next";

import OverviewDashboardClient from "./OverviewDashboardClient";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: tr.m02_overview_title,
};

export default function M02OverviewPage() {
  return <OverviewDashboardClient />;
}
