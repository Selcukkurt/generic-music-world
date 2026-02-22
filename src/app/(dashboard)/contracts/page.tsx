import type { Metadata } from "next";

import ApprovalsClient from "./ApprovalsClient";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: tr.shell_personal_item_2,
};

export default function ContractsPage() {
  return <ApprovalsClient />;
}
