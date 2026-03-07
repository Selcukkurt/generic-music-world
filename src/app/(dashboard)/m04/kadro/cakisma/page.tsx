import type { Metadata } from "next";
import RequireAccess from "@/components/auth/RequireAccess";
import ConflictCheckClient from "./ConflictCheckClient";

export const metadata: Metadata = {
  title: "Çakışma Kontrolü - M04",
};

export default function M04KadroCakismaPage() {
  return (
    <RequireAccess resource="personnel" action="view">
      <div className="p-6">
        <ConflictCheckClient />
      </div>
    </RequireAccess>
  );
}
