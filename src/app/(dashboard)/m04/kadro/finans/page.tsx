import type { Metadata } from "next";
import RequireAccess from "@/components/auth/RequireAccess";
import FinansTransferClient from "./FinansTransferClient";

export const metadata: Metadata = {
  title: "Finans Aktarım - M04",
};

export default function M04KadroFinansPage() {
  return (
    <RequireAccess resource="personnel" action="view">
      <div className="p-6">
        <FinansTransferClient />
      </div>
    </RequireAccess>
  );
}
