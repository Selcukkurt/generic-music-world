"use client";

import { useState, useEffect } from "react";
import { fetchPermissions } from "@/lib/rbac-v1/api";
import type { Permission } from "@/lib/rbac-v1/types";
import { usePermissions } from "@/hooks/usePermissions";

export default function PermissionsTab() {
  const { hasPermission } = usePermissions();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const canRead = hasPermission("rbac.permissions.read");

  useEffect(() => {
    if (!canRead) return;
    fetchPermissions()
      .then(setPermissions)
      .catch(() => setPermissions([]))
      .finally(() => setLoading(false));
  }, [canRead]);

  const grouped = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    const g = p.group ?? "other";
    if (!acc[g]) acc[g] = [];
    acc[g].push(p);
    return acc;
  }, {});

  if (!canRead) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 text-center ui-text-muted">
        Bu sayfayı görüntüleme yetkiniz yok.
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80">
      <div className="border-b border-[var(--color-border)] px-4 py-4 sm:px-6">
        <h2 className="text-base font-semibold text-[var(--color-text)]">İzin Kataloğu</h2>
        <p className="mt-1 text-sm ui-text-muted">Salt okunur. Roller sekmesinden rol yetkilerini düzenleyebilirsiniz.</p>
      </div>
      <div className="p-4 sm:p-6">
        {loading ? (
          <p className="text-sm ui-text-muted">Yükleniyor...</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([group, perms]) => (
              <div key={group}>
                <h3 className="mb-3 text-sm font-semibold uppercase ui-text-muted">{group}</h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {perms.map((p) => (
                    <div
                      key={p.key}
                      className="rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-surface-elevated)]/50 px-4 py-3"
                    >
                      <code className="text-xs font-medium text-[var(--color-primary)]">{p.key}</code>
                      <p className="mt-1 text-sm ui-text-secondary">{p.description_tr ?? ""}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
