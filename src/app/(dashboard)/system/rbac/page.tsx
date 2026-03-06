"use client";

import { useState } from "react";
import PageHeader from "@/components/shell/PageHeader";
import { canAccessSystemResource } from "@/lib/rbac/canAccess";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import UsersTab from "./UsersTab";
import RolesTab from "./RolesTab";
import PermissionsTab from "./PermissionsTab";
import AccessLogsTab from "./AccessLogsTab";

const NAV_ITEMS = [
  { id: "users" as const, label: "Kullanıcılar" },
  { id: "roles" as const, label: "Roller" },
  { id: "permissions" as const, label: "İzinler" },
  { id: "logs" as const, label: "Erişim Kayıtları" },
] as const;

export default function SystemRbacPage() {
  const { user } = useCurrentUser();
  const canAccess = user ? canAccessSystemResource(user.role, "system_rbac") : false;
  const [section, setSection] = useState<(typeof NAV_ITEMS)[number]["id"]>("users");

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
        <PageHeader title="RBAC Yönetimi" subtitle="Yetkisiz erişim" />
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 text-center ui-text-muted">
          Bu sayfaya erişim yetkiniz yok.
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="RBAC Yönetimi"
        subtitle="Sistem erişim kontrolü: kullanıcılar, roller ve izinler."
      />
      <div className="flex min-h-[calc(100vh-12rem)] gap-6">
        {/* Left navigation */}
        <aside className="w-52 shrink-0">
          <nav className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-2 backdrop-blur-sm">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                  section === item.id
                    ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)]"
                    : "ui-text-secondary hover:bg-[var(--color-surface-hover)] hover:ui-text-primary"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>
        {/* Content */}
        <main className="min-w-0 flex-1">
          {section === "users" && <UsersTab />}
          {section === "roles" && <RolesTab />}
          {section === "permissions" && <PermissionsTab />}
          {section === "logs" && <AccessLogsTab />}
        </main>
      </div>
    </div>
  );
}
