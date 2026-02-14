import type { Metadata } from "next";

import ModuleNotReady from "@/components/ui/ModuleNotReady";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: tr.module_name_m07,
};

export default function M07Page() {
  return <ModuleNotReady />;
}
