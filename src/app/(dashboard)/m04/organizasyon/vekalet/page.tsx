import type { Metadata } from "next";
import RequireAccess from "@/components/auth/RequireAccess";
import DelegationPanelClient from "./DelegationPanelClient";

export const metadata: Metadata = {
  title: "Vekalet Paneli - M04",
};

export default function M04OrganizasyonVekaletPage() {
  return (
    <RequireAccess resource="personnel" action="view">
      <div className="p-6">
        <DelegationPanelClient />
      </div>
    </RequireAccess>
  );
}
