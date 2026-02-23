import type { Metadata } from "next";

import { tr } from "@/i18n/tr";
import M02OverviewClient from "./M02OverviewClient";

export const metadata: Metadata = {
  title: tr.module_name_m02,
};

export default function M02Page() {
  return <M02OverviewClient />;
}
