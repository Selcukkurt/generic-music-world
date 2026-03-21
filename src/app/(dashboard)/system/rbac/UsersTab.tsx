"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  fetchUsers,
  updateUserActive,
  assignUserRoles,
  fetchRoles,
  fetchUserEventAccess,
  updateUserEventAccess,
} from "@/lib/rbac-v1/api";
import { fetchPersonnelByProfileIds, getFullName } from "@/lib/m04/personnel";
import type { AppUserWithRoles, Role } from "@/lib/rbac-v1/types";
import type { EventAccessEntry } from "@/lib/rbac-v1/api";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/components/ui/ToastProvider";
import { fetchEvents } from "@/lib/events/data";
import { fetchPersonAssignments } from "@/lib/org-structure/data";
import { isNewRole } from "@/lib/rbac-v1/constants";
import { ROLE_LABELS, ROLE_CODES, ROLE_KEY_TO_LABEL, ROLE_BADGES, SYSTEM_ACCESS_LEVELS } from "@/lib/rbac/roleConfig";

const ROLE_BADGE_STYLES: Record<string, string> = {
  owner: "bg-purple-500/20 text-purple-300",
  admin: "bg-blue-500/20 text-blue-300",
  director: "bg-amber-500/20 text-amber-300",
  manager: "bg-emerald-500/20 text-emerald-300",
  staff: "bg-gray-500/20 text-gray-300",
  field: "bg-orange-500/20 text-orange-300",
  viewer: "bg-gray-600/30 text-gray-400",
};

function getRoleBadgeStyle(roleKey: string): string {
  return ROLE_BADGE_STYLES[roleKey.toLowerCase()] ?? "bg-[var(--color-surface2)] ui-text-secondary";
}

function getRoleDisplay(u: AppUserWithRoles): { label: string; code: string; level: number | null } {
  const level = u.role_level ?? null;
  const label = level != null ? (ROLE_LABELS[level] ?? "—") : (u.role_code ?? "—");
  const code = level != null ? (ROLE_CODES[level] ?? u.role_code ?? "—") : (u.role_code ?? "—");
  return { label, code, level };
}

function getInitials(u: AppUserWithRoles): string {
  if (u.full_name?.trim()) {
    const parts = u.full_name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return u.full_name.slice(0, 2).toUpperCase();
  }
  if (u.email) return u.email.slice(0, 2).toUpperCase();
  return "?";
}

function RoleBadge({ role }: { role: Role }) {
  const label = ROLE_KEY_TO_LABEL[role.key] ?? role.name_tr ?? role.key;
  const style = getRoleBadgeStyle(role.key);
  return (
    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}

export default function UsersTab() {
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const [users, setUsers] = useState<AppUserWithRoles[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [orgTitleMap, setOrgTitleMap] = useState<Record<string, string>>({});
  const [linkedPersonnelMap, setLinkedPersonnelMap] = useState<Record<string, string>>({});
  const [showLegacyRoles, setShowLegacyRoles] = useState(false);
  const [events, setEvents] = useState<Array<{ id: string; name: string; date: string; venue?: string }>>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AppUserWithRoles | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
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
      .then(async ([u, r]) => {
        setUsers(u);
        setRoles(r);
        try {
          const personnelMap = await fetchPersonnelByProfileIds(u.map((x) => x.id));
          const nameMap: Record<string, string> = {};
          personnelMap.forEach((rec, profileId) => {
            nameMap[profileId] = getFullName(rec);
          });
          setLinkedPersonnelMap(nameMap);
        } catch {
          setLinkedPersonnelMap({});
        }
      })
      .catch(() => toast.error("Yüklenemedi", "Kullanıcılar alınamadı."))
      .finally(() => setLoading(false));
  }, [search, canRead, toast]);

  useEffect(() => {
    fetchEvents()
      .then((list) => setEvents(list.map((e) => ({ id: e.id, name: e.name, date: e.date, venue: e.venue ?? undefined }))))
      .catch(() => setEvents([]));
  }, []);

  useEffect(() => {
    fetchPersonAssignments()
      .then((assignments) => {
        const map: Record<string, string> = {};
        for (const a of assignments) {
          if (a.is_primary && a.job_title?.name) {
            map[a.person_id] = a.job_title.name;
          } else if (!map[a.person_id] && a.job_title?.name) {
            map[a.person_id] = a.job_title.name;
          }
        }
        setOrgTitleMap(map);
      })
      .catch(() => setOrgTitleMap({}));
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

  const filteredRoles = useMemo(
    () =>
      roles
        .filter((r) => isNewRole(r.key) || showLegacyRoles)
        .sort((a, b) => (isNewRole(a.key) ? 0 : 1) - (isNewRole(b.key) ? 0 : 1)),
    [roles, showLegacyRoles]
  );

  const handleSelectUser = (u: AppUserWithRoles) => {
    setSelectedUser(u);
    const primaryRole = u.roles[0];
    setSelectedRoleId(primaryRole?.id ?? "");
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

  const handleSaveRoles = async () => {
    if (!selectedUser || !canWriteRoles) return;
    const roleIds = selectedRoleId ? [selectedRoleId] : [];
    try {
      await assignUserRoles(selectedUser.id, roleIds);
      const newRoles = roles.filter((r) => r.id === selectedRoleId);
      setUsers((prev) =>
        prev.map((x) => (x.id !== selectedUser.id ? x : { ...x, roles: newRoles }))
      );
      handleSelectUser({ ...selectedUser, roles: newRoles });
      toast.success("Kaydedildi", "Rol güncellendi.");
    } catch {
      toast.error("Hata", "Rol kaydedilemedi.");
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
      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 text-center backdrop-blur-sm ui-text-muted">
        Bu sayfayı görüntüleme yetkiniz yok.
      </div>
    );
  }

  return (
    <section className="ui-glass overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm">
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px]">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase ui-text-muted">Avatar</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase ui-text-muted">Ad</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase ui-text-muted">E-posta</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase ui-text-muted">Rol</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase ui-text-muted">role_level</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase ui-text-muted">can_login</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase ui-text-muted">Org. Unvan</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase ui-text-muted">Linked Personnel</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase ui-text-muted">Durum</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase ui-text-muted">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center ui-text-muted">
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
                  <td className="px-4 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface2)] text-sm font-medium text-[var(--color-text)]">
                      {getInitials(u)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-[var(--color-text)]">{u.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-sm ui-text-secondary">{u.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm">{getRoleDisplay(u).label}</span>
                      {u.role_level != null && SYSTEM_ACCESS_LEVELS.includes(u.role_level as 0 | 1 | 2) && (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-purple-500/20 text-purple-300">
                          Sistem Erişimi
                        </span>
                      )}
                      {u.role_level === 5 && ROLE_BADGES[5] && (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-orange-500/20 text-orange-300">
                          {ROLE_BADGES[5]}
                        </span>
                      )}
                      {u.role_level === 6 && ROLE_BADGES[6] && (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-gray-500/20 text-gray-400">
                          {ROLE_BADGES[6]}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm ui-text-secondary">
                    {u.role_level != null ? u.role_level : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.can_login === false
                          ? "bg-red-500/20 text-red-400"
                          : "bg-emerald-500/20 text-emerald-400"
                      }`}
                    >
                      {u.can_login === false ? "Hayır" : "Evet"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm ui-text-muted">{orgTitleMap[u.id] ?? "—"}</td>
                  <td className="px-4 py-3 text-sm ui-text-secondary">
                    {linkedPersonnelMap[u.id] ? (
                      <span className="font-medium text-[var(--color-text)]">{linkedPersonnelMap[u.id]}</span>
                    ) : (
                      <span className="ui-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {u.is_active ? "Aktif" : "Devre dışı"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectUser(u);
                      }}
                      className="rounded px-2 py-1 text-xs font-medium ui-text-secondary hover:bg-[var(--color-surface-hover)]"
                    >
                      Düzenle
                    </button>
                    {canDisable && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleActive(u);
                        }}
                        className="ml-1 rounded px-2 py-1 text-xs font-medium text-amber-400 hover:bg-amber-500/20"
                      >
                        {u.is_active ? "Devre dışı" : "Etkinleştir"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit User Drawer - rendered via portal to document.body */}
      {selectedUser &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              style={{ zIndex: 99999 }}
              onClick={() => setSelectedUser(null)}
              aria-hidden="true"
            />
            <div
              className="fixed right-0 top-0 flex h-screen min-h-0 w-full max-w-sm flex-col overflow-hidden border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl sm:max-w-md"
              style={{ zIndex: 100000 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="user-edit-title"
            >
            {/* Fixed header */}
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
              <h2 id="user-edit-title" className="truncate text-lg font-semibold text-[var(--color-text)]">
                {selectedUser.full_name ?? selectedUser.email ?? "Kullanıcı"}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="rounded-lg p-2 ui-text-muted transition hover:bg-[var(--color-surface-hover)]"
                aria-label="Kapat"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {/* User info */}
              <section className="mb-6">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider ui-text-muted">Kullanıcı Bilgisi</h3>
                <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/30 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface2)] text-sm font-medium text-[var(--color-text)]">
                    {getInitials(selectedUser)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--color-text)]">
                      {selectedUser.full_name ?? "—"}
                    </p>
                    <p className="truncate text-sm ui-text-muted">{selectedUser.email ?? "—"}</p>
                    <p className="mt-0.5 text-xs ui-text-muted">
                      Org. unvan: {orgTitleMap[selectedUser.id] ?? "—"}
                    </p>
                    <p className="mt-0.5 text-xs ui-text-muted">
                      Linked Personnel: {linkedPersonnelMap[selectedUser.id] ?? "—"}
                    </p>
                  </div>
                </div>
              </section>

              {/* System role */}
              <section className="mb-6">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider ui-text-muted">Sistem Rolü</h3>
                {roles.some((r) => !isNewRole(r.key)) && (
                  <label className="mb-2 flex items-center gap-2 text-xs ui-text-muted">
                    <input
                      type="checkbox"
                      checked={showLegacyRoles}
                      onChange={(e) => setShowLegacyRoles(e.target.checked)}
                      className="rounded"
                    />
                    Legacy roller
                  </label>
                )}
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  disabled={!canWriteRoles}
                  className="ui-input w-full text-sm"
                >
                  <option value="">Rol seçin</option>
                  {filteredRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {ROLE_KEY_TO_LABEL[r.key] ?? r.name_tr ?? r.key}
                      {!isNewRole(r.key) && " (legacy)"}
                    </option>
                  ))}
                </select>
                {selectedRoleId && filteredRoles.find((r) => r.id === selectedRoleId)?.key === "owner" && (
                  <p className="mt-2 text-xs ui-text-muted">
                    Sadece bir Owner olabilir. Kaydetme mevcut Owner rolünü kaldırır.
                  </p>
                )}
              </section>

              {/* Status */}
              <section className="mb-6">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider ui-text-muted">Durum</h3>
                <p className="mb-2 text-sm">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      selectedUser.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {selectedUser.is_active ? "Aktif" : "Devre dışı"}
                  </span>
                </p>
              </section>

              {/* Event Access */}
              {canWriteRoles && (
                <section className="mb-6">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider ui-text-muted">Event Access</h3>
                  <p className="mb-3 text-xs ui-text-muted">
                    Bu kullanıcının erişebileceği etkinlikleri atayın.
                  </p>
                  {eventAccessLoading ? (
                    <p className="text-xs ui-text-muted">Yükleniyor...</p>
                  ) : (
                    <>
                      <div className="mb-3 max-h-32 space-y-1.5 overflow-y-auto rounded border border-[var(--color-border)] p-2">
                        {eventAccess.map((e) => (
                          <div
                            key={e.event_id}
                            className="flex items-center justify-between rounded bg-[var(--color-surface2)]/50 px-2 py-1.5 text-xs"
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
                          className="rounded border border-[var(--color-border)] bg-[var(--color-surface2)] px-2 py-1 text-xs hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
                        >
                          Ekle
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveEventAccess}
                        className="mt-2 w-full rounded-lg border border-[var(--color-border)] py-2 text-sm font-medium hover:bg-[var(--color-surface-hover)]"
                      >
                        Erişimi kaydet
                      </button>
                    </>
                  )}
                </section>
              )}
            </div>

            {/* Fixed footer */}
            <div className="flex shrink-0 flex-col space-y-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
              <button
                type="button"
                onClick={handleSaveRoles}
                disabled={!canWriteRoles}
                className="w-full rounded-lg bg-[var(--color-primary)] py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                Kaydet
              </button>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="w-full rounded-lg border border-[var(--color-border)] py-2.5 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
              >
                İptal
              </button>
              {canDisable && (
                <button
                  type="button"
                  onClick={() => handleToggleActive(selectedUser)}
                  className={`w-full rounded-lg py-2.5 text-sm font-medium transition ${
                    selectedUser.is_active
                      ? "border border-red-500/30 text-red-400 hover:bg-red-500/10"
                      : "border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                  }`}
                >
                  {selectedUser.is_active ? "Kullanıcıyı devre dışı bırak" : "Kullanıcıyı etkinleştir"}
                </button>
              )}
            </div>
          </div>
        </>,
          document.body
        )}
    </section>
  );
}
