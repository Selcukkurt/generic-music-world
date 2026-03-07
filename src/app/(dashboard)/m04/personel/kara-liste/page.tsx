import type { Metadata } from "next";
import RequireAccess from "@/components/auth/RequireAccess";
import KaraListeClient from "./KaraListeClient";

export const metadata: Metadata = {
  title: "Kara Liste - M04",
};

export default function M04PersonelKaraListePage() {
  return (
    <RequireAccess resource="personnel" action="view">
      <div className="p-6">
        <KaraListeClient />
      </div>
    </RequireAccess>
  );
}
