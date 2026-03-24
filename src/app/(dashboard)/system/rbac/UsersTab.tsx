"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  fetchUsers,
  updateUserActive,
  assignUserRoles,
  fetchRoles,
  fetchUserEventAccess,
  updateUserEventAccess,
  updateUser,
  updateUserLifecycle,
  inviteUser,
} from "@/lib/rbac-v1/api";
import UserDetailsDrawer from "./UserDetailsDrawer";
import { fetchPersonnelByProfileIds, getFullName } from "@/lib/m04/personnel";
import type { AppUserWithRoles, Role } from "@/lib/rbac-v1/types";
import type { EventAccessEntry } from "@/lib/rbac-v1/api";

function normalizeEventAccess(entries: EventAccessEntry[]) {
  return [...entries]
    .map((e) => ({ event_id: e.event_id, access_level: e.access_level }))
    .sort((a, b) => a.event_id.localeCompare(b.event_id));
}
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/components/ui/ToastProvider";
import { fetchEvents } from "@/lib/events/data";
import {
  ROLE_LABELS,
  ROLE_BADGES,
  ROLE_LEVEL,
  buildLevelToRoleIdMap,
  resolveRoleIdForLevel,
} from "@/lib/rbac/roleConfig";

/** role_level 5 (Saha Personeli) = can_login forced false. */
const SAHA_ROLE_LEVEL = 5;

/** Normalized display user: single source for table + drawer. RBAC owns access identity; Personnel owns name/avatar. */
type DisplayUser = AppUserWithRoles & { linked_personnel: string };

function getDisplayUser(
  u: AppUserWithRoles,
  linkedPersonnelMap: Record<string, string>
): DisplayUser {
  return {
    ...u,
    linked_personnel: linkedPersonnelMap[u.id] ?? "",
  };
}

function getRoleLabel(level: number | null): string {
  return level != null ? (ROLE_LABELS[level] ?? "—") : "—";
}

const ROLE_LEVELS_ORDER = [0, 1, 2, 3, 4, 5, 6] as const;
type RoleLevelUi = (typeof ROLE_LEVELS_ORDER)[number];

/** When DB has no row for a level (e.g. coo missing), pick closest assignable level. */
function findNearestAssignableLevel(
  want: number,
  map: Record<number, string>
): number {
  if (map[want]) return want;
  for (let d = 1; d <= 6; d++) {
    if (want + d <= 6 && map[want + d]) return want + d;
    if (want - d >= 0 && map[want - d]) return want - d;
  }
  return 6;
}

export default function UsersTab() {
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const [users, setUsers] = useState<AppUserWithRoles[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [linkedPersonnelMap, setLinkedPersonnelMap] = useState<Record<string, string>>({});
  const [events, setEvents] = useState<Array<{ id: string; name: string; date: string; venue?: string }>>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRoleLevel, setSelectedRoleLevel] = useState<number>(6);
  const [canLogin, setCanLogin] = useState(true);
  const [eventAccess, setEventAccess] = useState<EventAccessEntry[]>([]);
  const [eventAccessLoading, setEventAccessLoading] = useState(false);
  const [newEventId, setNewEventId] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createRoleLevel, setCreateRoleLevel] = useState<RoleLevelUi>(6);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [savingRoles, setSavingRoles] = useState(false);
  const [savingEvents, setSavingEvents] = useState(false);
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const eventAccessBaselineRef = useRef<string>("[]");

  const canDisable = hasPermission("users.disable");
  const canRead = hasPermission("users.read") || hasPermission("system.manage");
  const canWriteRoles = hasPermission("rbac.roles.write") || hasPermission("system.manage");
  const canCreate = hasPermission("users.create") || hasPermission("system.manage");

  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const usersRes = await Promise.allSettled([fetchUsers(search), fetchRoles()]);
      const [uOutcome, rOutcome] = usersRes;
      if (cancelled) return;

      if (uOutcome.status === "rejected") {
        const err = uOutcome.reason;
        console.error("[UsersTab] fetchUsers failed:", err);
        toast.error("Yüklenemedi", err instanceof Error ? err.message : "Kullanıcılar alınamadı.");
        setUsers([]);
        setRoles([]);
        setLinkedPersonnelMap({});
        return;
      }

      const u = uOutcome.value;
      setUsers(u);

      if (rOutcome.status === "fulfilled") {
        setRoles(rOutcome.value);
      } else {
        console.error("[UsersTab] fetchRoles failed (roles dropdown may be empty):", rOutcome.reason);
        setRoles([]);
      }

      try {
        const personnelMap = await fetchPersonnelByProfileIds(u.map((x) => x.id));
        if (cancelled) return;
        const nameMap: Record<string, string> = {};
        personnelMap.forEach((rec, profileId) => {
          nameMap[profileId] = getFullName(rec);
        });
        setLinkedPersonnelMap(nameMap);
      } catch (e) {
        console.error("[UsersTab] fetchPersonnelByProfileIds:", e);
        setLinkedPersonnelMap({});
      }
    })().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [search, canRead]);

  useEffect(() => {
    fetchEvents()
      .then((list) => setEvents(list.map((e) => ({ id: e.id, name: e.name, date: e.date, venue: e.venue ?? undefined }))))
      .catch(() => setEvents([]));
  }, []);

  const levelToRoleId = useMemo(() => buildLevelToRoleIdMap(roles), [roles]);
  const missingLevelRoles = useMemo(() => {
    const missing: number[] = [];
    for (const level of ROLE_LEVELS_ORDER) {
      if (!levelToRoleId[level]) missing.push(level);
    }
    return missing;
  }, [levelToRoleId]);

  const assignableLevels = useMemo(
    () => ROLE_LEVELS_ORDER.filter((l) => levelToRoleId[l]),
    [levelToRoleId]
  );

  const loadEventAccess = useCallback(
    async (userId: string) => {
      if (!canWriteRoles) return;
      setEventAccessLoading(true);
      try {
        const entries = await fetchUserEventAccess(userId);
        setEventAccess(entries);
        eventAccessBaselineRef.current = JSON.stringify(normalizeEventAccess(entries));
      } catch {
        setEventAccess([]);
        eventAccessBaselineRef.current = "[]";
      } finally {
        setEventAccessLoading(false);
      }
    },
    [canWriteRoles]
  );

  const displayUsers = useMemo(
    () => users.map((u) => getDisplayUser(u, linkedPersonnelMap)),
    [users, linkedPersonnelMap]
  );

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  const selectedDisplayUser = useMemo(
    () => (selectedUser ? getDisplayUser(selectedUser, linkedPersonnelMap) : null),
    [selectedUser, linkedPersonnelMap]
  );

  const isSahaRole = selectedRoleLevel === SAHA_ROLE_LEVEL;

  /** Level we treat as "saved" for dirty checks when DB rows are missing (e.g. coo not migrated). */
  const baselineRoleLevel = useMemo(() => {
    if (!selectedUser) return 6;
    const level = selectedUser.role_level ?? 6;
    return levelToRoleId[level]
      ? level
      : findNearestAssignableLevel(level, levelToRoleId);
  }, [selectedUser, levelToRoleId]);

  const rolesDirty = useMemo(() => {
    if (!selectedUser) return false;
    const initialLogin = selectedUser.can_login !== false;
    const levelDirty = selectedRoleLevel !== baselineRoleLevel;
    const loginDirty = !isSahaRole && canLogin !== initialLogin;
    return levelDirty || loginDirty;
  }, [selectedUser, selectedRoleLevel, canLogin, isSahaRole, baselineRoleLevel]);

  const eventsDirty = useMemo(
    () => JSON.stringify(normalizeEventAccess(eventAccess)) !== eventAccessBaselineRef.current,
    [eventAccess]
  );

  /** Event scoping applies only to Gözlemci (observer); other roles use global/module access. */
  useEffect(() => {
    if (!selectedUserId || !canWriteRoles) return;
    if (selectedRoleLevel === ROLE_LEVEL.OBSERVER) {
      loadEventAccess(selectedUserId);
    } else {
      setEventAccess([]);
      eventAccessBaselineRef.current = JSON.stringify(normalizeEventAccess([]));
      setEventAccessLoading(false);
    }
  }, [selectedUserId, selectedRoleLevel, canWriteRoles, loadEventAccess]);

  /** When the same drawer stays open but server user row updates (refresh, roles map load) and form is clean, sync from server. */
  useEffect(() => {
    if (!selectedUserId || !selectedUser) return;
    if (rolesDirty) return;
    setSelectedRoleLevel(baselineRoleLevel);
    setCanLogin(
      baselineRoleLevel === SAHA_ROLE_LEVEL ? false : selectedUser.can_login !== false
    );
  }, [
    selectedUserId,
    baselineRoleLevel,
    selectedUser?.role_level,
    selectedUser?.can_login,
    rolesDirty,
  ]);

  useEffect(() => {
    if (selectedRoleLevel === SAHA_ROLE_LEVEL) setCanLogin(false);
  }, [selectedRoleLevel]);

  useEffect(() => {
    if (!assignableLevels.some((l) => l === createRoleLevel)) {
      setCreateRoleLevel((assignableLevels[0] ?? 6) as RoleLevelUi);
    }
  }, [assignableLevels, createRoleLevel]);

  /** Row click is the source of truth: always reset draft form from this row (same or different user, including re-click). */
  const handleSelectUser = (u: DisplayUser) => {
    const rawLevel = u.role_level ?? 6;
    const safeLevel = levelToRoleId[rawLevel]
      ? rawLevel
      : findNearestAssignableLevel(rawLevel, levelToRoleId);
    setSelectedUserId(u.id);
    setSelectedRoleLevel(safeLevel);
    setCanLogin(safeLevel === SAHA_ROLE_LEVEL ? false : u.can_login !== false);
    setNewEventId("");
    setEventAccess([]);
    eventAccessBaselineRef.current = JSON.stringify(normalizeEventAccess([]));
    if (safeLevel !== ROLE_LEVEL.OBSERVER) {
      setEventAccessLoading(false);
    }
  };

  const handleToggleActive = async (u: AppUserWithRoles) => {
    if (!canDisable) return;
    try {
      await updateUserActive(u.id, !u.is_active);
      const refreshed = await fetchUsers(search);
      setUsers(refreshed);
      toast.success("Güncellendi", u.is_active ? "Kullanıcı devre dışı bırakıldı." : "Kullanıcı etkinleştirildi.");
    } catch (e) {
      toast.error("Hata", e instanceof Error ? e.message : "İşlem başarısız.");
    }
  };

  const handleSaveRoles = async () => {
    if (!selectedUser || !canWriteRoles || !rolesDirty || savingRoles) return;
    const roleId = resolveRoleIdForLevel(roles, selectedRoleLevel);
    if (!roleId) {
      toast.error(
        "Hata",
        `Rol eşleşmesi bulunamadı (seviye ${selectedRoleLevel}). ` +
          (missingLevelRoles.length
            ? `Veritabanında bu seviyeler için rol satırı yok: ${missingLevelRoles.join(", ")}. ` +
              "Supabase migrasyonlarını uygulayın (ceo/coo rolleri)."
            : "")
      );
      return;
    }
    const roleIds = [roleId];
    setSavingRoles(true);
    try {
      await assignUserRoles(selectedUser.id, roleIds);
      if (selectedRoleLevel !== ROLE_LEVEL.OBSERVER) {
        await updateUserEventAccess(selectedUser.id, []);
      }
      if (!isSahaRole && canLogin !== (selectedUser.can_login !== false)) {
        await updateUser(selectedUser.id, { can_login: canLogin });
      }
      const refreshed = await fetchUsers(search);
      setUsers(refreshed);
      toast.success("Kaydedildi", "Rol ve giriş ayarları güncellendi.");
    } catch (e) {
      toast.error("Hata", e instanceof Error ? e.message : "Rol kaydedilemedi.");
    } finally {
      setSavingRoles(false);
    }
  };

  const handleCloseDrawer = () => {
    setSelectedUserId(null);
    setSelectedRoleLevel(6);
    setCanLogin(true);
    setEventAccess([]);
    setNewEventId("");
    eventAccessBaselineRef.current = "[]";
    setEventAccessLoading(false);
  };

  const handleLifecyclePassive = async () => {
    if (!selectedUser || !canDisable) return;
    setLifecycleBusy(true);
    try {
      await updateUserActive(selectedUser.id, false);
      const refreshed = await fetchUsers(search);
      setUsers(refreshed);
      toast.success("Güncellendi", "Kullanıcı pasifleştirildi.");
    } catch (e) {
      toast.error("Hata", e instanceof Error ? e.message : "İşlem başarısız.");
    } finally {
      setLifecycleBusy(false);
    }
  };

  const handleLifecycleRestore = async () => {
    if (!selectedUser || !canDisable) return;
    setLifecycleBusy(true);
    try {
      await updateUserLifecycle(selectedUser.id, "active");
      const refreshed = await fetchUsers(search);
      setUsers(refreshed);
      toast.success("Güncellendi", "Kullanıcı geri yüklendi.");
    } catch (e) {
      toast.error("Hata", e instanceof Error ? e.message : "İşlem başarısız.");
    } finally {
      setLifecycleBusy(false);
    }
  };

  const handleLifecycleActivate = async () => {
    if (!selectedUser || !canDisable) return;
    setLifecycleBusy(true);
    try {
      await updateUserActive(selectedUser.id, true);
      const refreshed = await fetchUsers(search);
      setUsers(refreshed);
      toast.success("Güncellendi", "Kullanıcı aktifleştirildi.");
    } catch (e) {
      toast.error("Hata", e instanceof Error ? e.message : "İşlem başarısız.");
    } finally {
      setLifecycleBusy(false);
    }
  };

  const handleAddEventAccess = () => {
    if (!selectedUserId || selectedRoleLevel !== ROLE_LEVEL.OBSERVER) return;
    if (!newEventId) {
      toast.error("Etkinlik seçin", "Etkinlik eklemek için listeden bir etkinlik seçin.");
      return;
    }
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
        profile_id: selectedUserId,
        access_level: "view" as const,
        event: ev ? { id: ev.id, name: ev.name, date: ev.date, venue: ev.venue } : null,
      },
    ]);
    setNewEventId("");
  };

  const handleRemoveEventAccess = (eventId: string) => {
    if (selectedRoleLevel !== ROLE_LEVEL.OBSERVER) return;
    setEventAccess((prev) => prev.filter((e) => e.event_id !== eventId));
  };

  const handleSaveEventAccess = async () => {
    if (!selectedUserId || !canWriteRoles || !eventsDirty || selectedRoleLevel !== ROLE_LEVEL.OBSERVER)
      return;
    if (eventAccess.length === 0) {
      toast.error(
        "Etkinlik gerekli",
        "Gözlemci rolünde kullanıcı yalnızca atanan etkinlikleri görebilir; en az bir etkinlik seçin."
      );
      return;
    }
    setSavingEvents(true);
    try {
      await updateUserEventAccess(
        selectedUserId,
        eventAccess.map((e) => ({ event_id: e.event_id, access_level: "view" as const }))
      );
      await loadEventAccess(selectedUserId);
      toast.success("Kaydedildi", "Etkinlik erişimi güncellendi.");
    } catch (e) {
      toast.error("Hata", e instanceof Error ? e.message : "Etkinlik erişimi kaydedilemedi.");
    } finally {
      setSavingEvents(false);
    }
  };

  const handleCreateUser = async () => {
    if (!createEmail.trim()) {
      toast.error("E-posta gerekli", "Geçerli bir e-posta adresi girin.");
      return;
    }
    const roleId = resolveRoleIdForLevel(roles, createRoleLevel);
    if (!roleId) {
      toast.error("Hata", "Rol seçimi geçersiz.");
      return;
    }
    setCreateSubmitting(true);
    try {
      await inviteUser({
        email: createEmail.trim(),
        role_id: roleId,
      });
      const refreshed = await fetchUsers(search);
      setUsers(refreshed);
      toast.success("Davet gönderildi", `${createEmail} adresine davet e-postası gönderildi.`);
      setShowCreateModal(false);
      setCreateEmail("");
      setCreateRoleLevel(6);
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Davet gönderilemedi.");
    } finally {
      setCreateSubmitting(false);
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
          <div className="flex gap-2">
            {canCreate && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                + Kullanıcı Ekle
              </button>
            )}
            <input
              type="search"
              placeholder="Ara (e-posta)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ui-input w-full max-w-xs text-sm"
            />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px]">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase ui-text-muted">E-posta</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase ui-text-muted">Sistem Rolü</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase ui-text-muted">Role Level</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase ui-text-muted">Can Login</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase ui-text-muted">Durum</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase ui-text-muted">Linked Personnel</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase ui-text-muted">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center ui-text-muted">
                  Yükleniyor...
                </td>
              </tr>
            ) : (
              displayUsers.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  className={`cursor-pointer transition hover:bg-[var(--color-surface-hover)]/50 ${
                    selectedUserId === u.id ? "bg-[var(--color-primary)]/5" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-sm ui-text-secondary">{u.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm">{getRoleLabel(u.role_level ?? null)}</span>
                      {u.role_level != null && ROLE_BADGES[u.role_level] && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            u.role_level === 5
                              ? "bg-orange-500/20 text-orange-300"
                              : "bg-gray-500/20 text-gray-400"
                          }`}
                        >
                          {ROLE_BADGES[u.role_level]}
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
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {u.is_active ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm ui-text-secondary">
                    {u.linked_personnel ? (
                      <span className="font-medium text-[var(--color-text)]">{u.linked_personnel}</span>
                    ) : (
                      <span className="ui-text-muted">—</span>
                    )}
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
                      Detay
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
                        {u.is_active ? "Pasif yap" : "Aktif yap"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit User Drawer */}
      {selectedDisplayUser &&
        selectedUser &&
        typeof document !== "undefined" &&
        createPortal(
          <UserDetailsDrawer
            key={`drawer-${selectedUser.id}`}
            displayUser={selectedDisplayUser}
            selectedUser={selectedUser}
            assignableLevels={assignableLevels}
            selectedRoleLevel={selectedRoleLevel}
            setSelectedRoleLevel={setSelectedRoleLevel}
            canLogin={canLogin}
            setCanLogin={setCanLogin}
            rolesDirty={rolesDirty}
            savingRoles={savingRoles}
            onSaveRoles={handleSaveRoles}
            eventAccess={eventAccess}
            eventAccessLoading={eventAccessLoading}
            eventsDirty={eventsDirty}
            savingEvents={savingEvents}
            onSaveEventAccess={handleSaveEventAccess}
            onAddEventAccess={handleAddEventAccess}
            onRemoveEventAccess={handleRemoveEventAccess}
            newEventId={newEventId}
            setNewEventId={setNewEventId}
            events={events}
            canWriteRoles={canWriteRoles}
            canDisable={canDisable}
            lifecycleBusy={lifecycleBusy}
            onLifecyclePassive={handleLifecyclePassive}
            onLifecycleRestore={handleLifecycleRestore}
            onLifecycleActivate={handleLifecycleActivate}
            onClose={handleCloseDrawer}
          />,
          document.body
        )}

      {/* Create User Modal – portaled to body to escape section overflow */}
      {showCreateModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowCreateModal(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-user-title"
          >
            <div
              className="w-full max-w-md shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="create-user-title" className="text-lg font-semibold text-[var(--color-text)]">
                Kullanıcı Ekle
              </h2>
              <p className="mt-1 text-sm ui-text-muted">
                E-posta ile davet gönderin. Ad, avatar ve personel verisi Personel modülünden yönetilir.
              </p>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
                    E-posta *
                  </label>
                  <input
                    type="email"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="ornek@firma.com"
                    className="ui-input w-full text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
                    Sistem Rolü *
                  </label>
                  <select
                    value={createRoleLevel}
                    onChange={(e) =>
                      setCreateRoleLevel(Number(e.target.value) as RoleLevelUi)
                    }
                    className="ui-input w-full text-sm"
                  >
                    {assignableLevels.map((level) => (
                      <option key={level} value={level}>
                        {ROLE_LABELS[level]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] py-2.5 text-sm font-medium ui-text-secondary hover:bg-[var(--color-surface-hover)]"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleCreateUser}
                  disabled={createSubmitting}
                  className="flex-1 rounded-lg bg-[var(--color-primary)] py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {createSubmitting ? "Gönderiliyor..." : "Davet Gönder"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}
