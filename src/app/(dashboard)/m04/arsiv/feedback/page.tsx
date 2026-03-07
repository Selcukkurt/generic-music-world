import type { Metadata } from "next";
import RequireAccess from "@/components/auth/RequireAccess";
import M04PlaceholderPage from "@/components/m04/M04PlaceholderPage";

export const metadata: Metadata = {
  title: "Feedback Merkezi - M04",
};

export default function M04ArsivFeedbackPage() {
  return (
    <RequireAccess resource="personnel" action="view">
      <M04PlaceholderPage
        title="Feedback Merkezi"
        subtitle="Personel performans ve etkinlik feedback yönetimi."
      />
    </RequireAccess>
  );
}
