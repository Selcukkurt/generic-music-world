"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchRoles, fetchPermissions, fetchRolePermissions, updateRolePermissions } from "@/lib/rbac-v1/api";
import type { Role, Permission } from "@/lib/rbac-v1/types";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/components/ui/ToastProvider";
import { isNewRole, isNewPermissionGroup } from "@/lib/rbac-v1/constants";

const NEW_GROUP_ORDER = ["dashboard", "event", "finance", "marketing", "artist_ops", "ticketing", "system"];

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
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 text-center ui-text-muted">
        Bu sayfayı görüntüleme yetkiniz yok.
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80">
      <div className="flex">
        <div className="w-64 shrink-0 border-r border-[var(--color-border)] p-4">
          <h2 className="mb-3 text-sm font-semibold">Roller</h2>
          {(hasLegacyRoles || hasLegacyPermissions) && (
            <label className="mb-3 flex items-center gap-2 text-xs ui-text-muted">
              <input
                type="checkbox"
                checked={showLegacy}
                onChange={(e) => setShowLegacy(e.target.checked)}
                className="rounded"
              />
              Legacy göster
            </label>
          )}
          {loading ? (
            <p className="text-sm ui-text-muted">Yükleniyor...</p>
          ) : (
            <ul className="space-y-1">
              {filteredRoles.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedRole(r)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                      selectedRole?.id === r.id
                        ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)]"
                        : "hover:bg-[var(--color-surface-hover)]"
                    }`}
                  >
                    {r.name_tr ?? r.key}
                    {!isNewRole(r.key) && (
                      <span className="ml-1 text-[10px] ui-text-muted">(legacy)</span>
                    )}
                    {r.is_system && isNewRole(r.key) && (
                      <span className="ml-1 text-[10px] ui-text-muted">(sistem)</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex-1 p-4">
          {selectedRole ? (
            <>
              <h3 className="mb-2 text-base font-semibold">{selectedRole.name_tr ?? selectedRole.key}</h3>
              <p className="mb-4 text-sm ui-text-muted">{selectedRole.description_tr ?? ""}</p>
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
            </>
          ) : (
            <p className="text-sm ui-text-muted">Rol seçin</p>
          )}
        </div>
      </div>
    </section>
  );
}
