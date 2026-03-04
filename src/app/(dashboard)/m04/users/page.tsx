import type { Metadata } from "next";
import PageHeader from "@/components/shell/PageHeader";
import M04UsersClient from "./M04UsersClient";

export const metadata: Metadata = {
  title: "Kullanıcılar - İK ve Organizasyon",
};

export default function M04UsersPage() {
  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Kullanıcılar"
        subtitle="Kullanıcı yönetimi ve rol atamaları."
      />
      <M04UsersClient />
    </div>
  );
}
