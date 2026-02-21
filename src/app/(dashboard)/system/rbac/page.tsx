"use client";

import PageHeader from "@/components/shell/PageHeader";

export default function SystemRbacPage() {
  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Rol Yönetimi"
        subtitle="Sistem rolleri ve yetkilendirme."
      />
      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 backdrop-blur-sm">
        <p className="ui-text-muted text-center text-sm">
          Rol yönetimi modülü yakında aktif olacak. CEO, SYSTEM_OWNER rolünü oluşturamaz veya atayamaz.
        </p>
      </div>
    </div>
  );
}
