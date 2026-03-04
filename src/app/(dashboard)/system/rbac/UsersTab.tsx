"use client";

import { useState, useEffect } from "react";
import { fetchUsers, updateUserActive, assignUserRoles } from "@/lib/rbac-v1/api";
import { fetchRoles } from "@/lib/rbac-v1/api";
import type { AppUserWithRoles, Role } from "@/lib/rbac-v1/types";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/components/ui/ToastProvider";

export default function UsersTab() {
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const [users, setUsers] = useState<AppUserWithRoles[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AppUserWithRoles | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());

  const canDisable = hasPermission("users.disable");
  const canRead = hasPermission("users.read");

  useEffect(() => {
    if (!canRead) return;
    Promise.all([fetchUsers(search), fetchRoles()])
      .then(([u, r]) => {
        setUsers(u);
        setRoles(r);
      })
      .catch(() => toast.error("Yüklenemedi", "Kullanıcılar alınamadı."))
      .finally(() => setLoading(false));
  }, [search, canRead, toast]);

  const handleSelectUser = (u: AppUserWithRoles) => {
    setSelectedUser(u);
    setSelectedRoleIds(new Set(u.roles.map((r) => r.id)));
  };

  const handleToggleActive = async (u: AppUserWithRoles) => {
    if (!canDisable) return;
    try {
      await updateUserActive(u.id, !u.is_active);
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, is_active: !u.is_active } : x))
      );
      if (selectedUser?.id === u.id) handleSelectUser({ ...selectedUser, is_active: !u.is_active });
      toast.success("Güncellendi", u.is_active ? "Kullanıcı devre dışı bırakıldı." : "Kullanıcı etkinleştirildi.");
    } catch {
      toast.error("Hata", "İşlem başarısız.");
    }
  };

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  };

  const handleSaveRoles = async () => {
    if (!selectedUser || !hasPermission("rbac.roles.write")) return;
    try {
      await assignUserRoles(selectedUser.id, Array.from(selectedRoleIds));
      setUsers((prev) =>
        prev.map((x) => {
          if (x.id !== selectedUser.id) return x;
          const newRoles = roles.filter((r) => selectedRoleIds.has(r.id));
          return { ...x, roles: newRoles };
        })
      );
      handleSelectUser({ ...selectedUser, roles: roles.filter((r) => selectedRoleIds.has(r.id)) });
      toast.success("Kaydedildi", "Roller güncellendi.");
    } catch {
      toast.error("Hata", "Roller kaydedilemedi.");
    }
  };

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-[var(--color-text)]">Kullanıcılar</h2>
          <input
            type="search"
            placeholder="Ara (e-posta, ad)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ui-input w-full max-w-xs text-sm"
          />
        </div>
      </div>
      <div className="flex">
        <div className="flex-1 overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase ui-text-muted">E-posta</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase ui-text-muted">Ad</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase ui-text-muted">Durum</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase ui-text-muted">Roller</th>
                {canDisable && (
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase ui-text-muted">İşlem</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center ui-text-muted">
                    Yükleniyor...
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className={`cursor-pointer transition hover:bg-[var(--color-surface-hover)]/50 ${
                      selectedUser?.id === u.id ? "bg-[var(--color-primary)]/5" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-sm">{u.email ?? "—"}</td>
                    <td className="px-4 py-3 text-sm">{u.full_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {u.is_active ? "Aktif" : "Devre dışı"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {u.roles.map((r) => r.name_tr ?? r.key).join(", ") || "—"}
                    </td>
                    {canDisable && (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleActive(u);
                          }}
                          className="rounded px-2 py-1 text-xs font-medium text-amber-400 hover:bg-amber-500/20"
                        >
                          {u.is_active ? "Devre dışı bırak" : "Etkinleştir"}
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {selectedUser && (
          <div className="w-80 shrink-0 border-l border-[var(--color-border)] p-4">
            <h3 className="mb-3 text-sm font-semibold">Rol ata</h3>
            <div className="space-y-2">
              {roles.map((r) => (
                <label key={r.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedRoleIds.has(r.id)}
                    onChange={() => handleRoleToggle(r.id)}
                    className="rounded"
                  />
                  <span className="text-sm">{r.name_tr ?? r.key}</span>
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={handleSaveRoles}
              className="mt-4 w-full rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Kaydet
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
