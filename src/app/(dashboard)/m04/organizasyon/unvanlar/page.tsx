import type { Metadata } from "next";
import RequireAccess from "@/components/auth/RequireAccess";
import JobTitleLibraryClient from "./JobTitleLibraryClient";

export const metadata: Metadata = {
  title: "Job Title Library - M04",
};

export default function M04OrganizasyonUnvanlarPage() {
  return (
    <RequireAccess resource="personnel" action="view">
      <div className="p-6">
        <JobTitleLibraryClient />
      </div>
    </RequireAccess>
  );
}
