import type { Metadata } from "next";

import ModuleNotReady from "@/components/ui/ModuleNotReady";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: tr.module_name_m10,
};

export default function M10Page() {
  return <ModuleNotReady />;
}
