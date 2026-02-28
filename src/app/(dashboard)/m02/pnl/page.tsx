import type { Metadata } from "next";

import PnlWorkspaceClient from "./PnlWorkspaceClient";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: `${tr.m02_pnl_title} – ${tr.module_name_m02}`,
};

export default function M02PnlPage() {
  return <PnlWorkspaceClient />;
}
