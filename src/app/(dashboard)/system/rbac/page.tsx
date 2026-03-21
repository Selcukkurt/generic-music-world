"use client";

import { useState } from "react";
import PageHeader from "@/components/shell/PageHeader";
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

/**
 * RBAC management page. Route: /system/rbac
 * RBAC bypass enabled – no auth/permission checks in render.
 */
export default function SystemRbacPage() {
  const [section, setSection] = useState<(typeof NAV_ITEMS)[number]["id"]>("users");

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="RBAC Yönetimi"
        subtitle="Sistem erişim kontrolü: kullanıcılar, roller ve izinler."
      />
      <div className="flex min-h-[calc(100vh-12rem)] gap-6">
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
