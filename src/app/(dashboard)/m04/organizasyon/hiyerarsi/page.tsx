import type { Metadata } from "next";
import RequireAccess from "@/components/auth/RequireAccess";
import M04OrgTreeClient from "./M04OrgTreeClient";

export const metadata: Metadata = {
  title: "Hiyerarşi Şeması - M04",
};

export default function M04OrganizasyonHiyerarsiPage() {
  return (
    <RequireAccess resource="personnel" action="view">
      <div className="p-6">
        <M04OrgTreeClient />
      </div>
    </RequireAccess>
  );
}
