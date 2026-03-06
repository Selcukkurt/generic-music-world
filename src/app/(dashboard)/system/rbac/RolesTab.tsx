"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchRoles, fetchPermissions, fetchRolePermissions, updateRolePermissions } from "@/lib/rbac-v1/api";
import type { Role, Permission } from "@/lib/rbac-v1/types";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/components/ui/ToastProvider";
import { isNewRole, isNewPermissionGroup } from "@/lib/rbac-v1/constants";

const NEW_GROUP_ORDER = ["dashboard", "event", "finance", "marketing", "artist_ops", "ticketing", "system"];
const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: "Tam sistem erişimi. Tüm modüllerde admin yetkisi.",
  admin: "Sistem yönetimi ve yapılandırma. Modül düzenlemeleri.",
  director: "Departman düzeyinde onay ve denetim.",
  manager: "Ekip ve modül yönetimi.",
  staff: "Operasyonel erişim.",
  field: "Saha operasyonları erişimi.",
  viewer: "Salt okunur erişim.",
};

export default function RolesTab() {
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissionKeys, setRolePermissionKeys] = useState<string[]>([]);
  const [draftKeys, setDraftKeys] = useState<Set<string>>(new Set());
  const [showLegacy, setShowLegacy] = useState(false);

  const canRead = hasPermission("rbac.roles.read") || hasPermission("system.manage");
  const canWrite = hasPermission("rbac.roles.write") || hasPermission("system.manage");

  useEffect(() => {
    if (!canRead) return;
    Promise.all([fetchRoles(), fetchPermissions()])
      .then(([r, p]) => {
        setRoles(r);
        setPermissions(p);
      })
      .catch(() => toast.error("Yüklenemedi", "Veriler alınamadı."))
      .finally(() => setLoading(false));
  }, [canRead, toast]);

  useEffect(() => {
    if (!selectedRole) return;
    fetchRolePermissions(selectedRole.id)
      .then((keys) => {
        setRolePermissionKeys(keys);
        setDraftKeys(new Set(keys));
      })
      .catch(() => {
        setRolePermissionKeys([]);
        setDraftKeys(new Set());
      });
  }, [selectedRole]);

  const handleTogglePermission = (key: string) => {
    if (!canWrite || selectedRole?.is_system) return;
    setDraftKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedRole || !canWrite || selectedRole.is_system) return;
    try {
      await updateRolePermissions(selectedRole.id, Array.from(draftKeys));
      setRolePermissionKeys(Array.from(draftKeys));
      toast.success("Kaydedildi", "Rol yetkileri güncellendi.");
    } catch {
      toast.error("Hata", "Yetkiler kaydedilemedi.");
    }
  };

  const sortedRoles = useMemo(() => {
    const newRoles = roles.filter((r) => isNewRole(r.key));
    const legacy = roles.filter((r) => !isNewRole(r.key));
    return [...newRoles, ...legacy];
  }, [roles]);

  const filteredRoles = useMemo(() => {
    if (showLegacy) return sortedRoles;
    return sortedRoles.filter((r) => isNewRole(r.key));
  }, [sortedRoles, showLegacy]);

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

  const hasLegacyRoles = useMemo(() => roles.some((r) => !isNewRole(r.key)), [roles]);
  const hasLegacyPermissions = useMemo(
    () => permissions.some((p) => !isNewPermissionGroup(p.group)),
    [permissions]
  );

  if (!canRead) {
    return (
      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 text-center backdrop-blur-sm ui-text-muted">
        Bu sayfayı görüntüleme yetkiniz yok.
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[var(--color-text)]">Roller</h2>
        {(hasLegacyRoles || hasLegacyPermissions) && (
          <label className="flex items-center gap-2 text-sm ui-text-muted">
            <input
              type="checkbox"
              checked={showLegacy}
              onChange={(e) => setShowLegacy(e.target.checked)}
              className="rounded"
            />
            Legacy göster
          </label>
        )}
      </div>

      {loading ? (
        <p className="text-sm ui-text-muted">Yükleniyor...</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRoles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRole(r)}
                className={`ui-glass rounded-xl border p-4 text-left backdrop-blur-sm transition ${
                  selectedRole?.id === r.id
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                    : "border-[var(--color-border)] bg-[var(--color-surface)]/80 hover:border-[var(--color-border)]/80"
                }`}
              >
                <h3 className="font-semibold text-[var(--color-text)]">{r.name_tr ?? r.key}</h3>
                <p className="mt-1 text-sm ui-text-muted line-clamp-2">
                  {ROLE_DESCRIPTIONS[r.key] ?? r.description_tr ?? ""}
                </p>
                {!isNewRole(r.key) && (
                  <span className="mt-2 inline-block text-[10px] ui-text-muted">(legacy)</span>
                )}
              </button>
            ))}
          </div>

          {selectedRole && (
            <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 backdrop-blur-sm sm:p-6">
              <h3 className="mb-2 text-base font-semibold">{selectedRole.name_tr ?? selectedRole.key}</h3>
              <p className="mb-4 text-sm ui-text-muted">{selectedRole.description_tr ?? ROLE_DESCRIPTIONS[selectedRole.key] ?? ""}</p>
              <div className="space-y-4">
                {grouped.map(({ label, perms }) => (
                  <div key={label}>
                    <h4 className="mb-2 text-xs font-semibold uppercase ui-text-muted">{label}</h4>
                    <div className="flex flex-wrap gap-3">
                      {perms.map((p) => (
                        <label
                          key={p.key}
                          className={`flex items-center gap-2 ${
                            selectedRole.is_system || !canWrite ? "cursor-not-allowed opacity-60" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={draftKeys.has(p.key)}
                            onChange={() => handleTogglePermission(p.key)}
                            disabled={selectedRole.is_system || !canWrite}
                            className="rounded"
                          />
                          <span className="text-sm">{p.description_tr ?? p.key}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {canWrite && !selectedRole.is_system && (
                <button
                  type="button"
                  onClick={handleSave}
                  className="mt-6 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  Kaydet
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
