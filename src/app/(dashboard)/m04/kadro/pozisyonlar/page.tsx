import type { Metadata } from "next";
import RequireAccess from "@/components/auth/RequireAccess";
import OpenPositionsClient from "./OpenPositionsClient";

export const metadata: Metadata = {
  title: "Açık Pozisyonlar - M04",
};

export default function M04KadroPozisyonlarPage() {
  return (
    <RequireAccess resource="personnel" action="view">
      <div className="p-6">
        <OpenPositionsClient />
      </div>
    </RequireAccess>
  );
}
