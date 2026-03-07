"use client";

import PageHeader from "@/components/shell/PageHeader";

type M04PlaceholderPageProps = {
  title: string;
  subtitle?: string;
};

export default function M04PlaceholderPage({ title, subtitle }: M04PlaceholderPageProps) {
  return (
    <div className="flex w-full flex-col gap-6 p-6">
      <PageHeader title={title} subtitle={subtitle ?? "Bu bölüm yakında eklenecek."} />
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
