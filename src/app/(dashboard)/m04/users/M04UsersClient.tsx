"use client";

import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { canAccessSystemResource } from "@/lib/rbac/canAccess";

export default function M04UsersClient() {
  const router = useRouter();
  const { user, isLoading } = useCurrentUser();
  const { hasPermission } = usePermissions();
  const canAccessRbac = user ? canAccessSystemResource(user.role, "system_rbac") : false;
  const canReadUsers = hasPermission("users.read");

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 text-center ui-text-muted">
        Yükleniyor...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 text-center ui-text-muted">
        Yetkisiz erişim.
      </div>
    );
  }

  if (canAccessRbac && canReadUsers) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6">
        <p className="mb-4 text-sm ui-text-secondary">
          Kullanıcı yönetimi için Rol Yönetimi sayfasını kullanın.
        </p>
        <button
          type="button"
          onClick={() => router.push("/system/rbac")}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Rol Yönetimi (RBAC) sayfasına git
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 text-center ui-text-muted">
      Kullanıcı yönetimi için yetkiniz bulunmuyor.
    </div>
  );
}
