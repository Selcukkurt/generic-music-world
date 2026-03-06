import type { Metadata } from "next";
import RequireAccess from "@/components/auth/RequireAccess";
import OrgTreeClient from "./OrgTreeClient";

export const metadata: Metadata = {
  title: "Organizasyon Yapısı - İK",
};

export default function HrOrganizationPage() {
  return (
    <RequireAccess resource="personnel" action="view">
      <OrgTreeClient />
    </RequireAccess>
  );
}
