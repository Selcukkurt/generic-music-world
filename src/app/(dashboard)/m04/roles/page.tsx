import type { Metadata } from "next";
import PageHeader from "@/components/shell/PageHeader";
import M04RolesClient from "./M04RolesClient";

export const metadata: Metadata = {
  title: "Roller - İK ve Organizasyon",
};

export default function M04RolesPage() {
  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Roller"
        subtitle="Rol ve yetki yönetimi."
      />
      <M04RolesClient />
    </div>
  );
}
