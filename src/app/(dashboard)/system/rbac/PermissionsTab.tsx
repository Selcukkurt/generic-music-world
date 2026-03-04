"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchPermissions } from "@/lib/rbac-v1/api";
import type { Permission } from "@/lib/rbac-v1/types";
import { usePermissions } from "@/hooks/usePermissions";
import { isNewPermissionGroup } from "@/lib/rbac-v1/constants";

const NEW_GROUP_ORDER = ["dashboard", "event", "finance", "marketing", "artist_ops", "ticketing", "system"];

export default function PermissionsTab() {
  const { hasPermission } = usePermissions();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLegacy, setShowLegacy] = useState(false);

  const canRead = hasPermission("rbac.permissions.read") || hasPermission("system.manage");

  useEffect(() => {
    if (!canRead) return;
    fetchPermissions()
      .then(setPermissions)
      .catch(() => setPermissions([]))
      .finally(() => setLoading(false));
  }, [canRead]);

  const grouped = useMemo(() => {
    const acc: Record<string, Permission[]> = {};
    for (const p of permissions) {
      const g = (p.group ?? p.key.split(".")[0] ?? "other") as string;
      if (!acc[g]) acc[g] = [];
      acc[g].push(p);
    }
    const newGroups = NEW_GROUP_ORDER.filter((g) => acc[g]?.length);
    const legacyGroups = Object.keys(acc).filter((g) => !NEW_GROUP_ORDER.includes(g));
    const result: Array<{ label: string; perms: Permission[] }> = [];
    for (const g of newGroups) result.push({ label: g, perms: acc[g] });
    if (showLegacy) for (const g of legacyGroups) result.push({ label: `${g} (legacy)`, perms: acc[g] });
    return result;
  }, [permissions, showLegacy]);

  const hasLegacy = useMemo(
    () => permissions.some((p) => !isNewPermissionGroup(p.group)),
    [permissions]
  );

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
        {hasLegacy && (
          <label className="mt-3 flex items-center gap-2 text-sm ui-text-muted">
            <input
              type="checkbox"
              checked={showLegacy}
              onChange={(e) => setShowLegacy(e.target.checked)}
              className="rounded"
            />
            Legacy izinleri göster
          </label>
        )}
      </div>
      <div className="p-4 sm:p-6">
        {loading ? (
          <p className="text-sm ui-text-muted">Yükleniyor...</p>
        ) : grouped.length === 0 ? (
          <p className="text-sm ui-text-muted">
            Yeni izinler görünmüyor. Migration 20260235000000_rbac_v1_clean_model.sql çalıştırıldığından emin olun.
          </p>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ label, perms }) => (
              <div key={label}>
                <h3 className="mb-3 text-sm font-semibold uppercase ui-text-muted">{label}</h3>
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
