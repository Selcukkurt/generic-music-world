import type { Metadata } from "next";

import ForbiddenClient from "./ForbiddenClient";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: tr.meta_forbidden_title,
};

export default function ForbiddenPage() {
  return <ForbiddenClient />;
}
