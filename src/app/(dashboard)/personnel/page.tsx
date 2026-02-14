import type { Metadata } from "next";

import RequireAccess from "@/components/auth/RequireAccess";
import PageHeader from "@/components/shell/PageHeader";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: "Personel Yönetimi",
  description: "Personel ve yetki yönetimi",
};

export default function PersonnelPage() {
  return (
    <RequireAccess resource="personnel" action="view">
      <div className="flex w-full flex-col gap-6">
        <PageHeader
          title="Personel Yönetimi"
          subtitle="Personel listesi ve yetkilendirme."
        />
        <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-8 backdrop-blur-sm">
          <p className="ui-text-muted text-center text-sm">
            Personel yönetimi modülü yakında aktif olacak.
          </p>
        </div>
      </div>
    </RequireAccess>
  );
}
