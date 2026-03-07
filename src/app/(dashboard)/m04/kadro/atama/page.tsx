import type { Metadata } from "next";
import RequireAccess from "@/components/auth/RequireAccess";
import EventAssignmentsClient from "./EventAssignmentsClient";

export const metadata: Metadata = {
  title: "Etkinlik Kadro Atama - M04",
};

export default function M04KadroAtamaPage() {
  return (
    <RequireAccess resource="personnel" action="view">
      <div className="p-6">
        <EventAssignmentsClient />
      </div>
    </RequireAccess>
  );
}
