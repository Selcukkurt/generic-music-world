import type { Metadata } from "next";
import RequireAccess from "@/components/auth/RequireAccess";
import M04PlaceholderPage from "@/components/m04/M04PlaceholderPage";

export const metadata: Metadata = {
  title: "Job Titles - M04",
};

export default function M04UnvanlarJobTitlesPage() {
  return (
    <RequireAccess resource="personnel" action="view">
      <M04PlaceholderPage
        title="Job Titles"
        subtitle="Unvan kütüphanesi ve job title yönetimi."
      />
    </RequireAccess>
  );
}
