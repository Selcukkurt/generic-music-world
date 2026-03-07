import type { Metadata } from "next";
import RequireAccess from "@/components/auth/RequireAccess";
import M04PersonnelListClient from "./M04PersonnelListClient";

export const metadata: Metadata = {
  title: "Personnel List - M04",
};

export default function M04PersonelPage() {
  return (
    <RequireAccess resource="personnel" action="view">
      <div className="p-6">
        <M04PersonnelListClient />
      </div>
    </RequireAccess>
  );
}
