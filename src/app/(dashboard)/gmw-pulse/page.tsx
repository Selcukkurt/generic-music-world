import type { Metadata } from "next";

import GMWPulseClient from "./GMWPulseClient";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: `GMW Pulse V1 – ${tr.meta_default_title}`,
};

export default function GMWPulsePage() {
  return <GMWPulseClient />;
}
