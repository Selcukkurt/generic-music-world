import type { Metadata } from "next";
import RequireAccess from "@/components/auth/RequireAccess";
import PersonnelCardClient from "./PersonnelCardClient";

export const metadata: Metadata = {
  title: "360° Personel Kartı - M04",
};

export default function M04PersonelKartPage() {
  return (
    <RequireAccess resource="personnel" action="view">
      <div className="p-6">
        <PersonnelCardClient />
      </div>
    </RequireAccess>
  );
}
