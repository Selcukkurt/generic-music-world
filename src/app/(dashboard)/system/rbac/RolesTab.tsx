"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchRoles, fetchPermissions, fetchRolePermissions, updateRolePermissions } from "@/lib/rbac-v1/api";
import type { Role, Permission } from "@/lib/rbac-v1/types";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/components/ui/ToastProvider";
import { isNewPermissionGroup } from "@/lib/rbac-v1/constants";
import { ROLE_HIERARCHY_DISPLAY, LEVEL_TO_ROLE_KEY } from "@/lib/rbac/roleConfig";

const NEW_GROUP_ORDER = ["dashboard", "event", "finance", "marketing", "artist_ops", "ticketing", "system"];

const CARD_STYLE =
  "ui-glass rounded-xl border p-4 text-left backdrop-blur-sm transition border-[var(--color-border)] bg-[var(--color-surface)]/80 hover:border-[var(--color-border)]/80";
const CARD_STYLE_SELECTED =
  "ui-glass rounded-xl border p-4 text-left backdrop-blur-sm transition border-[var(--color-primary)] bg-[var(--color-primary)]/10";
const PANEL_STYLE =
  "ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 backdrop-blur-sm sm:p-6";

export default function RolesTab() {
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [rolePermissionKeys, setRolePermissionKeys] = useState<string[]>([]);
  const [draftKeys, setDraftKeys] = useState<Set<string>>(new Set());
  const [permsLoading, setPermsLoading] = useState(false);

  const canRead = hasPermission("rbac.roles.read") || hasPermission("system.manage");
  const canWrite = hasPermission("rbac.roles.write") || hasPermission("system.manage");

  const selectedDbRole = useMemo(() => {
    if (selectedLevel == null) return null;
    const key = LEVEL_TO_ROLE_KEY[selectedLevel];
    return roles.find((r) => r.key === key) ?? null;
  }, [selectedLevel, roles]);

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
    if (!selectedDbRole) {
      setRolePermissionKeys([]);
      setDraftKeys(new Set());
      setPermsLoading(false);
      return;
    }
    setPermsLoading(true);
    fetchRolePermissions(selectedDbRole.id)
      .then((keys) => {
        setRolePermissionKeys(keys);
        setDraftKeys(new Set(keys));
      })
      .catch(() => {
        setRolePermissionKeys([]);
        setDraftKeys(new Set());
      })
      .finally(() => setPermsLoading(false));
  }, [selectedDbRole]);

  const handleTogglePermission = (key: string) => {
    if (!canWrite || selectedDbRole?.is_system) return;
    setDraftKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedDbRole || !canWrite || selectedDbRole.is_system) return;
    try {
      await updateRolePermissions(selectedDbRole.id, Array.from(draftKeys));
      setRolePermissionKeys(Array.from(draftKeys));
      toast.success("Kaydedildi", "Rol yetkileri güncellendi.");
    } catch {
      toast.error("Hata", "Yetkiler kaydedilemedi.");
    }
  };

  const handleSelectRole = (level: number) => {
    setSelectedLevel((prev) => (prev === level ? null : level));
  };

  const grouped = useMemo(() => {
    const acc: Record<string, Permission[]> = {};
    for (const p of permissions) {
      const g = (p.group ?? p.key.split(".")[0] ?? "other") as string;
      if (!acc[g]) acc[g] = [];
      acc[g].push(p);
    }
    const newGroups = NEW_GROUP_ORDER.filter((g) => acc[g]?.length);
    const result: Array<{ label: string; perms: Permission[] }> = [];
    for (const g of newGroups) result.push({ label: g, perms: acc[g] });
    return result;
  }, [permissions]);

  const selectedDisplay =
    selectedLevel != null && selectedLevel >= 0 && selectedLevel < ROLE_HIERARCHY_DISPLAY.length
      ? ROLE_HIERARCHY_DISPLAY[selectedLevel]
      : null;

  if (!canRead) {
    return (
      <div className={`${PANEL_STYLE} p-8 text-center ui-text-muted`}>
        Bu sayfayı görüntüleme yetkiniz yok.
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <h2 className="text-base font-semibold text-[var(--color-text)]">Roller</h2>

      {loading ? (
        <p className="text-sm ui-text-muted">Yükleniyor...</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ROLE_HIERARCHY_DISPLAY.map((entry) => (
              <button
                key={entry.level}
                type="button"
                onClick={() => handleSelectRole(entry.level)}
                className={selectedLevel === entry.level ? CARD_STYLE_SELECTED : CARD_STYLE}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-[var(--color-text)]">{entry.label}</h3>
                  {entry.badge != null && (
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/20 text-amber-300">
                      {entry.badge}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm ui-text-muted line-clamp-2">{entry.description}</p>
              </button>
            ))}
          </div>

          {selectedLevel != null && selectedDisplay && (
            <div className={PANEL_STYLE}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-[var(--color-text)]">{selectedDisplay.label}</h3>
                {selectedDisplay.badge != null && (
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/20 text-amber-300">
                    {selectedDisplay.badge}
                  </span>
                )}
              </div>
              <p className="mb-4 text-sm ui-text-muted">{selectedDisplay.description}</p>

              {!selectedDbRole ? (
                <p className="text-sm ui-text-muted">
                  Bu rol için veritabanında eşleşen rol bulunamadı. Roller veritabanında tanımlanmalıdır.
                </p>
              ) : permsLoading ? (
                <p className="text-sm ui-text-muted">İzinler yükleniyor...</p>
              ) : (
                <>
                  <div className="space-y-4">
                    {grouped.map(({ label, perms }) => (
                      <div key={label}>
                        <h4 className="mb-2 text-xs font-semibold uppercase ui-text-muted">{label}</h4>
                        <div className="flex flex-wrap gap-3">
                          {perms.map((p) => (
                            <label
                              key={p.key}
                              className={
                                selectedDbRole.is_system || !canWrite ? "flex cursor-not-allowed gap-2 opacity-60" : "flex cursor-pointer gap-2"
                              }
                            >
                              <input
                                type="checkbox"
                                checked={draftKeys.has(p.key)}
                                onChange={() => handleTogglePermission(p.key)}
                                disabled={selectedDbRole.is_system || !canWrite}
                                className="rounded"
                              />
                              <span className="text-sm">{p.description_tr ?? p.key}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {canWrite && !selectedDbRole.is_system && (
                    <button
                      type="button"
                      onClick={handleSave}
                      className="mt-6 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                    >
                      Kaydet
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
