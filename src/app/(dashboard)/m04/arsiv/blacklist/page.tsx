import type { Metadata } from "next";
import RequireAccess from "@/components/auth/RequireAccess";
import M04PlaceholderPage from "@/components/m04/M04PlaceholderPage";

export const metadata: Metadata = {
  title: "Blacklist - M04",
};

export default function M04ArsivBlacklistPage() {
  return (
    <RequireAccess resource="personnel" action="view">
      <M04PlaceholderPage
        title="Blacklist"
        subtitle="Blacklist yönetimi ve geçmiş kayıtlar."
      />
    </RequireAccess>
  );
}
