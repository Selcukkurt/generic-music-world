"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchUsers,
  updateUserActive,
  assignUserRoles,
  fetchRoles,
  fetchUserEventAccess,
  updateUserEventAccess,
} from "@/lib/rbac-v1/api";
import type { AppUserWithRoles, Role } from "@/lib/rbac-v1/types";
import type { EventAccessEntry } from "@/lib/rbac-v1/api";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/components/ui/ToastProvider";
import { fetchEvents } from "@/lib/events/data";
import { isNewRole } from "@/lib/rbac-v1/constants";

export default function UsersTab() {
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const [users, setUsers] = useState<AppUserWithRoles[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [showLegacyRoles, setShowLegacyRoles] = useState(false);
  const [events, setEvents] = useState<Array<{ id: string; name: string; date: string; venue?: string }>>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AppUserWithRoles | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [eventAccess, setEventAccess] = useState<EventAccessEntry[]>([]);
  const [eventAccessLoading, setEventAccessLoading] = useState(false);
  const [newEventId, setNewEventId] = useState("");
  const [newEventLevel, setNewEventLevel] = useState<"view" | "edit">("view");

  const canDisable = hasPermission("users.disable");
  const canRead = hasPermission("users.read") || hasPermission("system.manage");
  const canWriteRoles = hasPermission("rbac.roles.write") || hasPermission("system.manage");

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

  useEffect(() => {
    fetchEvents()
      .then((list) => setEvents(list.map((e) => ({ id: e.id, name: e.name, date: e.date, venue: e.venue ?? undefined }))))
      .catch(() => setEvents([]));
  }, []);

  const loadEventAccess = useCallback(
    async (userId: string) => {
      if (!canWriteRoles) return;
      setEventAccessLoading(true);
      try {
        const entries = await fetchUserEventAccess(userId);
        setEventAccess(entries);
      } catch {
        setEventAccess([]);
      } finally {
        setEventAccessLoading(false);
      }
    },
    [canWriteRoles]
  );

  const handleSelectUser = (u: AppUserWithRoles) => {
    setSelectedUser(u);
    setSelectedRoleIds(new Set(u.roles.map((r) => r.id)));
    loadEventAccess(u.id);
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
    if (!selectedUser || !canWriteRoles) return;
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

  const handleAddEventAccess = () => {
    if (!newEventId || !selectedUser) return;
    const already = eventAccess.some((e) => e.event_id === newEventId);
    if (already) {
      toast.error("Zaten ekli", "Bu etkinlik zaten atanmış.");
      return;
    }
    const ev = events.find((e) => e.id === newEventId);
    setEventAccess((prev) => [
      ...prev,
      {
        event_id: newEventId,
        profile_id: selectedUser.id,
        access_level: newEventLevel,
        event: ev ? { id: ev.id, name: ev.name, date: ev.date, venue: ev.venue } : null,
      },
    ]);
    setNewEventId("");
  };

  const handleRemoveEventAccess = (eventId: string) => {
    setEventAccess((prev) => prev.filter((e) => e.event_id !== eventId));
  };

  const handleSaveEventAccess = async () => {
    if (!selectedUser || !canWriteRoles) return;
    try {
      await updateUserEventAccess(
        selectedUser.id,
        eventAccess.map((e) => ({ event_id: e.event_id, access_level: e.access_level }))
      );
      toast.success("Kaydedildi", "Etkinlik erişimi güncellendi.");
    } catch {
      toast.error("Hata", "Etkinlik erişimi kaydedilemedi.");
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
          <div className="w-96 shrink-0 border-l border-[var(--color-border)] p-4">
            <h3 className="mb-3 text-sm font-semibold">Rol ata</h3>
            {roles.some((r) => !isNewRole(r.key)) && (
              <label className="mb-3 flex items-center gap-2 text-xs ui-text-muted">
                <input
                  type="checkbox"
                  checked={showLegacyRoles}
                  onChange={(e) => setShowLegacyRoles(e.target.checked)}
                  className="rounded"
                />
                Legacy roller
              </label>
            )}
            <div className="space-y-2">
              {roles
                .filter((r) => isNewRole(r.key) || showLegacyRoles)
                .sort((a, b) => (isNewRole(a.key) ? 0 : 1) - (isNewRole(b.key) ? 0 : 1))
                .map((r) => (
                <label key={r.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedRoleIds.has(r.id)}
                    onChange={() => handleRoleToggle(r.id)}
                    className="rounded"
                  />
                  <span className="text-sm">
                    {r.name_tr ?? r.key}
                    {!isNewRole(r.key) && (
                      <span className="ml-1 text-[10px] ui-text-muted">(legacy)</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={handleSaveRoles}
              className="mt-4 w-full rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Rolleri kaydet
            </button>

            {canWriteRoles && (
              <>
                <h3 className="mt-6 mb-3 text-sm font-semibold">Event Access</h3>
                <p className="mb-3 text-xs ui-text-muted">
                  Bu kullanıcının erişebileceği etkinlikleri atayın. Partner kullanıcılar sadece atandıkları etkinlikleri görebilir.
                </p>
                {eventAccessLoading ? (
                  <p className="text-xs ui-text-muted">Yükleniyor...</p>
                ) : (
                  <>
                    <div className="mb-3 space-y-2">
                      {eventAccess.map((e) => (
                        <div
                          key={e.event_id}
                          className="flex items-center justify-between rounded border border-[var(--color-border)] px-2 py-1.5 text-xs"
                        >
                          <span>
                            {(e.event as { name?: string })?.name ?? e.event_id.slice(0, 8)}… (
                            {e.access_level === "edit" ? "düzenle" : "görüntüle"})
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveEventAccess(e.event_id)}
                            className="text-red-400 hover:underline"
                          >
                            Kaldır
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={newEventId}
                        onChange={(e) => setNewEventId(e.target.value)}
                        className="ui-input flex-1 text-xs"
                      >
                        <option value="">Etkinlik seç</option>
                        {events
                          .filter((ev) => !eventAccess.some((ea) => ea.event_id === ev.id))
                          .map((ev) => (
                            <option key={ev.id} value={ev.id}>
                              {ev.name} ({ev.date})
                            </option>
                          ))}
                      </select>
                      <select
                        value={newEventLevel}
                        onChange={(e) => setNewEventLevel(e.target.value as "view" | "edit")}
                        className="ui-input w-24 text-xs"
                      >
                        <option value="view">Görüntüle</option>
                        <option value="edit">Düzenle</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleAddEventAccess}
                        disabled={!newEventId}
                        className="rounded bg-[var(--color-surface-elevated)] px-2 py-1 text-xs hover:opacity-90 disabled:opacity-50"
                      >
                        Ekle
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveEventAccess}
                      className="mt-3 w-full rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-surface-hover)]"
                    >
                      Erişimi kaydet
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
