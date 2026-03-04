import type { Metadata } from "next";
import PageHeader from "@/components/shell/PageHeader";

export const metadata: Metadata = {
  title: "Organizasyon - İK ve Organizasyon",
};

export default function M04OrgPage() {
  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Organizasyon"
        subtitle="Organizasyon yapısı ve departman yönetimi."
      />
      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 backdrop-blur-sm">
        <p className="text-sm ui-text-muted">
          Organizasyon yönetimi yakında eklenecek.
        </p>
      </div>
    </div>
  );
}
