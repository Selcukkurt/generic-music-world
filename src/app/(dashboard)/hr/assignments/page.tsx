import type { Metadata } from "next";
import RequireAccess from "@/components/auth/RequireAccess";
import AssignmentsClient from "./AssignmentsClient";

export const metadata: Metadata = {
  title: "Atamalar - İK",
};

export default function HrAssignmentsPage() {
  return (
    <RequireAccess resource="personnel" action="view">
      <AssignmentsClient />
    </RequireAccess>
  );
}
