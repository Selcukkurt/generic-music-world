import type { Metadata } from "next";

import ModuleNotReady from "@/components/ui/ModuleNotReady";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: tr.module_name_m05,
};

export default function M05Page() {
  return <ModuleNotReady />;
}
