import type { Metadata } from "next";

import RequireAccess from "@/components/auth/RequireAccess";
import PersonnelClient from "./PersonnelClient";

export const metadata: Metadata = {
  title: "Personel Listesi",
  description: "Ekibini görüntüle, filtrele ve yetki/ekip bilgilerini yönet.",
};

export default function PersonnelPage() {
  return (
    <RequireAccess resource="personnel" action="view">
      <PersonnelClient />
    </RequireAccess>
  );
}
