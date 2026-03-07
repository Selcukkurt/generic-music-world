import type { Metadata } from "next";
import RequireAccess from "@/components/auth/RequireAccess";
import M04PlaceholderPage from "@/components/m04/M04PlaceholderPage";

export const metadata: Metadata = {
  title: "Geçmiş Etkinlik Arşivi - M04",
};

export default function M04ArsivEtkinliklerPage() {
  return (
    <RequireAccess resource="personnel" action="view">
      <M04PlaceholderPage
        title="Geçmiş Etkinlik Arşivi"
        subtitle="Geçmiş etkinliklerin arşivi ve raporlama."
      />
    </RequireAccess>
  );
}
