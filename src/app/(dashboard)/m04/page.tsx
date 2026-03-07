import type { Metadata } from "next";
import PageHeader from "@/components/shell/PageHeader";

export const metadata: Metadata = {
  title: "İK ve Organizasyon Operasyonları",
};

export default function M04OverviewPage() {
  return (
    <div className="flex w-full flex-col gap-6 p-6">
      <PageHeader
        title="İK ve Organizasyon Operasyonları"
        subtitle="İnsan kaynakları ve organizasyon yapısı yönetimi."
      />
      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 backdrop-blur-sm">
        <div className="flex flex-col gap-4">
          <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-surface-elevated)]/60" />
          <div className="h-4 w-full max-w-md animate-pulse rounded bg-[var(--color-surface-elevated)]/40" />
          <div className="h-4 w-full max-w-sm animate-pulse rounded bg-[var(--color-surface-elevated)]/40" />
        </div>
      </div>
    </div>
  );
}
