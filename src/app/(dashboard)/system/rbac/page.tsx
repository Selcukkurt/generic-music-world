"use client";

import { useState } from "react";
import PageHeader from "@/components/shell/PageHeader";
import { usePermissions } from "@/hooks/usePermissions";
import { canAccessSystemResource } from "@/lib/rbac/canAccess";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import UsersTab from "./UsersTab";
import RolesTab from "./RolesTab";
import PermissionsTab from "./PermissionsTab";

const TABS = [
  { id: "users" as const, label: "Kullanıcılar" },
  { id: "roles" as const, label: "Roller" },
  { id: "permissions" as const, label: "İzinler" },
] as const;

export default function SystemRbacPage() {
  const { user } = useCurrentUser();
  const canAccess = user ? canAccessSystemResource(user.role, "system_rbac") : false;
  const [tab, setTab] = useState<"users" | "roles" | "permissions">("users");

  if (!user) {
    return (
      <div className="flex w-full items-center justify-center p-12">
        <p className="ui-text-muted">Yükleniyor...</p>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="flex w-full flex-col gap-6">
        <PageHeader title="Rol Yönetimi" subtitle="Yetkisiz erişim" />
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 text-center ui-text-muted">
          Bu sayfaya erişim yetkiniz yok.
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Rol Yönetimi (RBAC V1)"
        subtitle="Kullanıcılar, roller ve izinleri yönetin."
      />
      <div className="flex gap-2 border-b border-[var(--color-border)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent ui-text-muted hover:ui-text-secondary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "users" && <UsersTab />}
      {tab === "roles" && <RolesTab />}
      {tab === "permissions" && <PermissionsTab />}
    </div>
  );
}
