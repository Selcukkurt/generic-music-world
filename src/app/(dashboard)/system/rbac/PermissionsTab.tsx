"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchRoles, fetchPermissions, fetchRolePermissions } from "@/lib/rbac-v1/api";
import type { Role, Permission } from "@/lib/rbac-v1/types";
import { usePermissions } from "@/hooks/usePermissions";
import { isNewRole, isNewPermissionGroup } from "@/lib/rbac-v1/constants";
import { ROLE_KEY_TO_LABEL } from "@/lib/rbac/roleConfig";

const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  event: "Etkinlikler",
  finance: "Finans",
  marketing: "Pazarlama",
  artist_ops: "Sanatçı Ops",
  ticketing: "Biletleme",
  system: "Sistem",
};

const ACTION_LEVELS = ["view", "edit", "manage", "admin"] as const;
const ACTION_LABELS: Record<string, string> = {
  view: "Görüntüle",
  edit: "Düzenle",
  manage: "Yönet",
  admin: "Admin",
};

function permissionToLevel(key: string): { module: string; level: string } | null {
  const [module, action] = key.split(".");
  if (!module || !action) return null;
  if (action === "view") return { module, level: "view" };
  if (action === "edit" || action === "create") return { module, level: "edit" };
  if (action === "approve" || action === "export") return { module, level: "manage" };
  if (action === "manage" || key === "system.manage") return { module, level: "admin" };
  return { module, level: "edit" };
}

export default function PermissionsTab() {
  const { hasPermission } = usePermissions();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePerms, setRolePerms] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [showLegacy, setShowLegacy] = useState(false);

  const canRead = hasPermission("rbac.permissions.read") || hasPermission("system.manage");

  useEffect(() => {
    if (!canRead) return;
    Promise.all([fetchRoles(), fetchPermissions()])
      .then(([r, p]) => {
        setRoles(r);
        setPermissions(p);
        return Promise.all(r.map((role) => fetchRolePermissions(role.id).then((keys) => ({ roleId: role.id, keys }))));
      })
      .then((results) => {
        const map: Record<string, Set<string>> = {};
        for (const { roleId, keys } of results) {
          map[roleId] = new Set(keys);
        }
        setRolePerms(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [canRead]);

  const { modules, matrix } = useMemo(() => {
    const modSet = new Set<string>();
    for (const p of permissions) {
      const g = p.group ?? p.key.split(".")[0];
      if (g && (showLegacy || isNewPermissionGroup(g))) modSet.add(g);
    }
    const mods = Array.from(modSet).sort((a, b) => {
      const order = ["dashboard", "event", "finance", "marketing", "artist_ops", "ticketing", "system"];
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return a.localeCompare(b);
    });

    const mat: Record<string, Record<string, Record<string, boolean>>> = {};
    for (const mod of mods) {
      mat[mod] = {};
      for (const role of roles) {
        if (!showLegacy && !isNewRole(role.key)) continue;
        const keys = rolePerms[role.id] ?? new Set();
        mat[mod][role.id] = {
          view: false,
          edit: false,
          manage: false,
          admin: false,
        };
        for (const key of keys) {
          const pl = permissionToLevel(key);
          if (!pl || pl.module !== mod) continue;
          const level = pl.level as (typeof ACTION_LEVELS)[number];
          if (ACTION_LEVELS.includes(level)) mat[mod][role.id][level] = true;
          if (pl.level === "edit") mat[mod][role.id].edit = true;
          if (pl.level === "manage") mat[mod][role.id].manage = true;
          if (pl.level === "admin") mat[mod][role.id].admin = true;
        }
        if (mat[mod][role.id].admin) {
          mat[mod][role.id].view = true;
          mat[mod][role.id].edit = true;
          mat[mod][role.id].manage = true;
        } else if (mat[mod][role.id].manage) {
          mat[mod][role.id].view = true;
          mat[mod][role.id].edit = true;
        } else if (mat[mod][role.id].edit) {
          mat[mod][role.id].view = true;
        }
      }
    }
    return { modules: mods, matrix: mat };
  }, [permissions, roles, rolePerms, showLegacy]);

  const filteredRoles = useMemo(() => {
    if (showLegacy) return roles;
    return roles.filter((r) => isNewRole(r.key));
  }, [roles, showLegacy]);

  const hasLegacy = useMemo(
    () => permissions.some((p) => !isNewPermissionGroup(p.group)) || roles.some((r) => !isNewRole(r.key)),
    [permissions, roles]
  );

  if (!canRead) {
    return (
      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 text-center backdrop-blur-sm ui-text-muted">
        Bu sayfayı görüntüleme yetkiniz yok.
      </div>
    );
  }

  return (
    <section className="ui-glass overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm">
      <div className="border-b border-[var(--color-border)] px-4 py-4 sm:px-6">
        <h2 className="text-base font-semibold text-[var(--color-text)]">İzin Matrisi</h2>
        <p className="mt-1 text-sm ui-text-muted">
          Modüller ve roller için izin seviyeleri. Roller sekmesinden düzenleyebilirsiniz.
        </p>
        {hasLegacy && (
          <label className="mt-3 flex items-center gap-2 text-sm ui-text-muted">
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
      <div className="overflow-x-auto p-4 sm:p-6">
        {loading ? (
          <p className="text-sm ui-text-muted">Yükleniyor...</p>
        ) : modules.length === 0 ? (
          <p className="text-sm ui-text-muted">Modül bulunamadı.</p>
        ) : (
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-3 py-2 text-left font-semibold ui-text-muted">Modül</th>
                {filteredRoles.map((r) => (
                  <th key={r.id} className="min-w-[90px] px-3 py-2 text-center text-xs font-semibold ui-text-secondary">
                    {ROLE_KEY_TO_LABEL[r.key] ?? r.name_tr ?? r.key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((mod) => (
                <tr key={mod} className="border-b border-[var(--color-border)]/50">
                  <td className="px-3 py-2 font-medium text-[var(--color-text)]">
                    {MODULE_LABELS[mod] ?? mod}
                  </td>
                  {filteredRoles.map((r) => {
                    const cell = matrix[mod]?.[r.id];
                    const levels = cell
                      ? (["view", "edit", "manage", "admin"] as const).filter((l) => cell[l])
                      : [];
                    return (
                      <td key={r.id} className="px-3 py-2 text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          {levels.map((l) => (
                            <span
                              key={l}
                              className="rounded bg-[var(--color-primary)]/20 px-1.5 py-0.5 text-[10px] text-[var(--color-primary)]"
                            >
                              {ACTION_LABELS[l]}
                            </span>
                          ))}
                          {levels.length === 0 && <span className="text-xs ui-text-muted">—</span>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
