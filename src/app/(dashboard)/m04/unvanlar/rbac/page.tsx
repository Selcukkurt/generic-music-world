"use client";

import Link from "next/link";
import RequireAccess from "@/components/auth/RequireAccess";
import PageHeader from "@/components/shell/PageHeader";

export default function M04UnvanlarRbacPage() {
  return (
    <RequireAccess resource="personnel" action="view">
      <div className="flex w-full flex-col gap-6 p-6">
        <PageHeader
          title="Sistem Rolleri (RBAC)"
          subtitle="Rol tabanlı erişim kontrolü yönetimi."
        />
        <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 backdrop-blur-sm">
          <p className="mb-4 text-sm ui-text-secondary">
            Sistem rolleri ve yetkileri merkezi RBAC sayfasında yönetilir.
          </p>
          <Link
            href="/system/rbac"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Rol Yönetimine Git
          </Link>
        </div>
      </div>
    </RequireAccess>
  );
}
