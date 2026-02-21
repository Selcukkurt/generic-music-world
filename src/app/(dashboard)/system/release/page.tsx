"use client";

import PageHeader from "@/components/shell/PageHeader";

export default function SystemReleasePage() {
  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Sürüm Yönetimi"
        subtitle="Release ve deployment yönetimi."
      />
      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 backdrop-blur-sm">
        <p className="ui-text-muted text-center text-sm">
          Sürüm yönetimi modülü yakında aktif olacak.
        </p>
      </div>
    </div>
  );
}
