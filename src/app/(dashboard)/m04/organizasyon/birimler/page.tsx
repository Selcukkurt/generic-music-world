import type { Metadata } from "next";
import RequireAccess from "@/components/auth/RequireAccess";
import OrgUnitsClient from "./OrgUnitsClient";

export const metadata: Metadata = {
  title: "Organizasyon Birimleri - M04",
};

export default function M04OrganizasyonBirimlerPage() {
  return (
    <RequireAccess resource="personnel" action="view">
      <div className="p-6">
        <OrgUnitsClient />
      </div>
    </RequireAccess>
  );
}
