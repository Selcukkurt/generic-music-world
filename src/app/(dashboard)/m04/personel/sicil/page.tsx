import type { Metadata } from "next";
import RequireAccess from "@/components/auth/RequireAccess";
import SicilClient from "./SicilClient";

export const metadata: Metadata = {
  title: "Dijital Sicil & Feedback - M04",
};

export default function M04PersonelSicilPage() {
  return (
    <RequireAccess resource="personnel" action="view">
      <div className="p-6">
        <SicilClient />
      </div>
    </RequireAccess>
  );
}
