import type { Metadata } from "next";

import RequireAccess from "@/components/auth/RequireAccess";
import PersonnelSettingsClient from "./PersonnelSettingsClient";

export const metadata: Metadata = {
  title: "Personel Ayarları",
  description: "Departman, ekip ve varsayılan personel ayarlarını yönet.",
};

export default function PersonnelSettingsPage() {
  return (
    <RequireAccess resource="personnel" action="manage">
      <PersonnelSettingsClient />
    </RequireAccess>
  );
}
