import type { Metadata } from "next";

import PlaceholderPageClient from "../PlaceholderPageClient";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: tr.page_contracts_title,
};

export default function ContractsPage() {
  return (
    <PlaceholderPageClient
      titleKey="page_contracts_title"
      descriptionKey="page_contracts_description"
    />
  );
}
