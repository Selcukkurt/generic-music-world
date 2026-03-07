import type { Metadata } from "next";
import RequireAccess from "@/components/auth/RequireAccess";
import PayrollApprovalClient from "./PayrollApprovalClient";

export const metadata: Metadata = {
  title: "Hak Ediş Onayı - M04",
};

export default function M04KadroHakEdisPage() {
  return (
    <RequireAccess resource="personnel" action="view">
      <div className="p-6">
        <PayrollApprovalClient />
      </div>
    </RequireAccess>
  );
}
