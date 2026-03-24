"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  fetchUsers,
  assignUserRoles,
  fetchRoles,
  fetchUserEventAccess,
  updateUserEventAccess,
  updateUser,
  updateUserLifecycle,
  inviteUser,
  resendUserInvite,
  fetchUserInviteLink,
  requestUserPasswordResetLink,
  permanentDeleteUser,
  type FetchUsersFilters,
} from "@/lib/rbac-v1/api";
import UserDetailsDrawer from "./UserDetailsDrawer";
import PermanentDeleteUserModal from "./PermanentDeleteUserModal";
import { fetchPersonnelByProfileIds, getFullName } from "@/lib/m04/personnel";
import type { AppUserWithRoles, Role } from "@/lib/rbac-v1/types";
import type { EventAccessEntry } from "@/lib/rbac-v1/api";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/components/ui/ToastProvider";
import { fetchEvents } from "@/lib/events/data";
import UserRowOverflowMenu from "./UserRowOverflowMenu";
import {
  getPrimaryRbacStatus,
  primaryRbacStatusLabel,
  primaryRbacStatusClass,
  getRbacStatusMetaLines,
} from "./usersTableHelpers";
import {
  ROLE_LABELS,
  ROLE_LEVEL,
  buildLevelToRoleIdMap,
  resolveRoleIdForLevel,
} from "@/lib/rbac/roleConfig";
import {
  getInviteSuccessToast,
  getResendInviteToast,
  getPasswordResetLinkToast,
} from "@/lib/rbac/inviteToast";
import { useCurrentUser } from "@/hooks/useCurrentUser";

function normalizeEventAccess(entries: EventAccessEntry[]) {
  return [...entries]
    .map((e) => ({ event_id: e.event_id, access_level: e.access_level }))
    .sort((a, b) => a.event_id.localeCompare(b.event_id));
}

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

function fmtShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
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
  const { user: currentUser } = useCurrentUser();
  const isSystemOwner = currentUser?.role === "system_owner";
  const [users, setUsers] = useState<AppUserWithRoles[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [linkedPersonnelMap, setLinkedPersonnelMap] = useState<Record<string, string>>({});
  const [events, setEvents] = useState<Array<{ id: string; name: string; date: string; venue?: string }>>([]);
  const [search, setSearch] = useState("");
  const [filterLifecycle, setFilterLifecycle] = useState("");
  const [filterRoleLevel, setFilterRoleLevel] = useState("");
  const [filterCanLogin, setFilterCanLogin] = useState<"all" | "yes" | "no">("all");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [invitedOnly, setInvitedOnly] = useState(false);
  const [adminActionBusy, setAdminActionBusy] = useState(false);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<AppUserWithRoles | null>(null);
  const [permanentDeleteBusy, setPermanentDeleteBusy] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);
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
  const filtersPanelRef = useRef<HTMLDivElement>(null);

  const listFilters = useMemo((): FetchUsersFilters => {
    const f: FetchUsersFilters = {};
    if (includeArchived) f.include_archived = true;
    if (invitedOnly) f.invited_only = true;
    if (filterCanLogin === "yes") f.can_login = true;
    if (filterCanLogin === "no") f.can_login = false;
    if (filterLifecycle) f.lifecycle = filterLifecycle;
    if (filterRoleLevel !== "") {
      const n = Number(filterRoleLevel);
      if (!Number.isNaN(n)) f.role_level = n;
    }
    return f;
  }, [includeArchived, invitedOnly, filterCanLogin, filterLifecycle, filterRoleLevel]);

  const hasActiveFilters = useMemo(
    () =>
      filterLifecycle !== "" ||
      filterRoleLevel !== "" ||
      filterCanLogin !== "all" ||
      includeArchived ||
      invitedOnly,
    [filterLifecycle, filterRoleLevel, filterCanLogin, includeArchived, invitedOnly]
  );

  const canRead = hasPermission("users.read") || hasPermission("system.manage");
  const canWriteRoles = hasPermission("rbac.roles.write") || hasPermission("system.manage");
  const canCreate = hasPermission("users.create") || hasPermission("system.manage");

  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const usersRes = await Promise.allSettled([fetchUsers(search, null, listFilters), fetchRoles()]);
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
  }, [search, canRead, listFilters]);

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

  useEffect(() => {
    if (!showFiltersPanel) return;
    const onDoc = (e: MouseEvent) => {
      if (filtersPanelRef.current && !filtersPanelRef.current.contains(e.target as Node)) {
        setShowFiltersPanel(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [showFiltersPanel]);

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
    if (!isSystemOwner) return;
    const life = u.lifecycle_status ?? "active";
    if (life === "archived") return;
    try {
      if (life === "passive") {
        await updateUserLifecycle(u.id, "active");
      } else {
        await updateUserLifecycle(u.id, "passive");
      }
      const refreshed = await fetchUsers(search, null, listFilters);
      setUsers(refreshed);
      toast.success(
        "Güncellendi",
        life === "passive" ? "Kullanıcı aktifleştirildi." : "Kullanıcı pasifleştirildi."
      );
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
      const refreshed = await fetchUsers(search, null, listFilters);
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

  const handleResendInviteFor = async (u: AppUserWithRoles) => {
    if (!isSystemOwner) return;
    setAdminActionBusy(true);
    try {
      const result = await resendUserInvite(u.id);
      const t = getResendInviteToast(result);
      toast.success(t.title, t.body);
      const refreshed = await fetchUsers(search, null, listFilters);
      setUsers(refreshed);
    } catch (e) {
      toast.error("Hata", e instanceof Error ? e.message : "Davet gönderilemedi.");
    } finally {
      setAdminActionBusy(false);
    }
  };

  const handleCopyInviteLinkFor = async (u: AppUserWithRoles) => {
    if (!isSystemOwner) return;
    setAdminActionBusy(true);
    try {
      const { manualInviteLink } = await fetchUserInviteLink(u.id);
      if (manualInviteLink) {
        await navigator.clipboard.writeText(manualInviteLink);
        toast.success("Kopyalandı", "Davet bağlantısı panoya alındı.");
      } else {
        toast.error("Bağlantı yok", "Davet bağlantısı oluşturulamadı.");
      }
    } catch (e) {
      toast.error("Hata", e instanceof Error ? e.message : "İşlem başarısız.");
    } finally {
      setAdminActionBusy(false);
    }
  };

  const handlePasswordResetLinkFor = async (u: AppUserWithRoles) => {
    if (!isSystemOwner) return;
    setAdminActionBusy(true);
    try {
      const { manualResetLink } = await requestUserPasswordResetLink(u.id);
      const t = getPasswordResetLinkToast(manualResetLink);
      if (manualResetLink) {
        await navigator.clipboard.writeText(manualResetLink);
      }
      toast.success(t.title, t.body);
    } catch (e) {
      toast.error("Hata", e instanceof Error ? e.message : "İşlem başarısız.");
    } finally {
      setAdminActionBusy(false);
    }
  };

  const handleLifecyclePassiveFor = async (u: AppUserWithRoles) => {
    if (!isSystemOwner) return;
    setLifecycleBusy(true);
    try {
      await updateUserLifecycle(u.id, "passive");
      const refreshed = await fetchUsers(search, null, listFilters);
      setUsers(refreshed);
      toast.success("Güncellendi", "Kullanıcı pasifleştirildi.");
    } catch (e) {
      toast.error("Hata", e instanceof Error ? e.message : "İşlem başarısız.");
    } finally {
      setLifecycleBusy(false);
    }
  };

  const handleLifecycleRestoreFor = async (u: AppUserWithRoles) => {
    if (!isSystemOwner) return;
    setLifecycleBusy(true);
    try {
      await updateUserLifecycle(u.id, "active");
      const refreshed = await fetchUsers(search, null, listFilters);
      setUsers(refreshed);
      toast.success("Güncellendi", "Kullanıcı geri yüklendi.");
    } catch (e) {
      toast.error("Hata", e instanceof Error ? e.message : "İşlem başarısız.");
    } finally {
      setLifecycleBusy(false);
    }
  };

  const handleLifecycleActivateFor = async (u: AppUserWithRoles) => {
    if (!isSystemOwner) return;
    setLifecycleBusy(true);
    try {
      await updateUserLifecycle(u.id, "active");
      const refreshed = await fetchUsers(search, null, listFilters);
      setUsers(refreshed);
      toast.success("Güncellendi", "Kullanıcı aktifleştirildi.");
    } catch (e) {
      toast.error("Hata", e instanceof Error ? e.message : "İşlem başarısız.");
    } finally {
      setLifecycleBusy(false);
    }
  };

  const handleLifecycleArchiveFor = async (u: AppUserWithRoles) => {
    if (!isSystemOwner) return;
    const ok = window.confirm(
      "Bu kullanıcı arşivlenecek; giriş kapatılır ve varsayılan listeden gizlenir. Arşivlenmiş kullanıcılar geri yüklenebilir. Devam edilsin mi?"
    );
    if (!ok) return;
    setLifecycleBusy(true);
    try {
      await updateUserLifecycle(u.id, "archived");
      const refreshed = await fetchUsers(search, null, listFilters);
      setUsers(refreshed);
      toast.success("Güncellendi", "Kullanıcı arşivlendi.");
    } catch (e) {
      toast.error("Hata", e instanceof Error ? e.message : "İşlem başarısız.");
    } finally {
      setLifecycleBusy(false);
    }
  };

  const handleLifecyclePassive = async () => {
    if (!selectedUser) return;
    await handleLifecyclePassiveFor(selectedUser);
  };

  const handleLifecycleRestore = async () => {
    if (!selectedUser) return;
    await handleLifecycleRestoreFor(selectedUser);
  };

  const handleLifecycleActivate = async () => {
    if (!selectedUser) return;
    await handleLifecycleActivateFor(selectedUser);
  };

  const handleLifecycleArchive = async () => {
    if (!selectedUser) return;
    await handleLifecycleArchiveFor(selectedUser);
  };

  const handleResendInvite = async () => {
    if (!selectedUser) return;
    await handleResendInviteFor(selectedUser);
  };

  const handleCopyInviteLink = async () => {
    if (!selectedUser) return;
    await handleCopyInviteLinkFor(selectedUser);
  };

  const handlePasswordResetLink = async () => {
    if (!selectedUser) return;
    await handlePasswordResetLinkFor(selectedUser);
  };

  const handlePermanentDeleteConfirm = async (payload: { confirmEmail: string; reason: string }) => {
    if (!permanentDeleteTarget) return;
    setPermanentDeleteBusy(true);
    try {
      await permanentDeleteUser(permanentDeleteTarget.id, {
        confirmEmail: payload.confirmEmail,
        reason: payload.reason || undefined,
      });
      toast.success("Kalıcı silindi", "Kullanıcı sistemden kaldırıldı.");
      setPermanentDeleteTarget(null);
      handleCloseDrawer();
      const refreshed = await fetchUsers(search, null, listFilters);
      setUsers(refreshed);
    } catch (e) {
      toast.error("Hata", e instanceof Error ? e.message : "Kalıcı silinemedi.");
    } finally {
      setPermanentDeleteBusy(false);
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
      const result = await inviteUser({
        email: createEmail.trim(),
        role_id: roleId,
      });
      const refreshed = await fetchUsers(search, null, listFilters);
      setUsers(refreshed);
      const inviteToast = getInviteSuccessToast(result, createEmail.trim());
      toast.success(inviteToast.title, inviteToast.body);
      setShowCreateModal(false);
      setCreateEmail("");
      setCreateRoleLevel(6);
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Davet gönderilemedi.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const clearFilters = useCallback(() => {
    setSearch("");
    setFilterLifecycle("");
    setFilterRoleLevel("");
    setFilterCanLogin("all");
    setIncludeArchived(false);
    setInvitedOnly(false);
    setShowFiltersPanel(false);
  }, []);

  const listEmpty = !loading && displayUsers.length === 0;
  const emptyFromFilters = listEmpty && (search.trim() !== "" || hasActiveFilters);

  if (!canRead) {
    return (
      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 text-center backdrop-blur-sm ui-text-muted">
        Bu sayfayı görüntüleme yetkiniz yok.
      </div>
    );
  }

  return (
    <section className="ui-glass overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm">
      <div className="border-b border-[var(--color-border)] px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-[var(--color-text)]">Kullanıcılar</h2>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <input
                type="search"
                placeholder="Ara (e-posta)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ui-input min-w-[200px] flex-1 text-sm sm:max-w-xs"
              />
              <div ref={filtersPanelRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowFiltersPanel((v) => !v)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    showFiltersPanel || hasActiveFilters
                      ? "border-[var(--color-border)] bg-[var(--color-surface2)] text-[var(--color-text)]"
                      : "border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]/60"
                  }`}
                  aria-expanded={showFiltersPanel}
                >
                  <svg className="h-4 w-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                  Filtreler
                  {hasActiveFilters ? (
                    <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--color-text-muted)]/20 px-1.5 text-[10px] font-semibold tabular-nums text-[var(--color-text-secondary)]">
                      •
                    </span>
                  ) : null}
                </button>
                {showFiltersPanel && (
                  <div
                    className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,20rem)] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xl"
                    role="dialog"
                    aria-label="Gelişmiş filtreler"
                  >
                    <p className="mb-3 text-xs font-medium uppercase tracking-wider ui-text-muted">
                      Gelişmiş filtreler
                    </p>
                    <div className="flex flex-col gap-3">
                      <label className="block text-xs ui-text-muted">
                        <span className="mb-1 block">Durum</span>
                        <select
                          value={filterLifecycle}
                          onChange={(e) => setFilterLifecycle(e.target.value)}
                          className="ui-input w-full text-sm"
                          aria-label="Yaşam döngüsü"
                        >
                          <option value="">Tüm durumlar</option>
                          <option value="active">Aktif</option>
                          <option value="passive">Pasif</option>
                          <option value="archived">Arşiv</option>
                        </select>
                      </label>
                      <label className="block text-xs ui-text-muted">
                        <span className="mb-1 block">Rol seviyesi</span>
                        <select
                          value={filterRoleLevel}
                          onChange={(e) => setFilterRoleLevel(e.target.value)}
                          className="ui-input w-full text-sm"
                          aria-label="Role level"
                        >
                          <option value="">Tüm seviyeler</option>
                          {ROLE_LEVELS_ORDER.map((lv) => (
                            <option key={lv} value={String(lv)}>
                              {ROLE_LABELS[lv]} ({lv})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-xs ui-text-muted">
                        <span className="mb-1 block">Giriş izni</span>
                        <select
                          value={filterCanLogin}
                          onChange={(e) => setFilterCanLogin(e.target.value as "all" | "yes" | "no")}
                          className="ui-input w-full text-sm"
                          aria-label="Giriş izni"
                        >
                          <option value="all">Tümü</option>
                          <option value="yes">Giriş açık</option>
                          <option value="no">Giriş kapalı</option>
                        </select>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                        <input
                          type="checkbox"
                          checked={includeArchived}
                          onChange={(e) => setIncludeArchived(e.target.checked)}
                          className="rounded border-[var(--color-border)]"
                        />
                        Arşivlenmişleri göster
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                        <input
                          type="checkbox"
                          checked={invitedOnly}
                          onChange={(e) => setInvitedOnly(e.target.checked)}
                          className="rounded border-[var(--color-border)]"
                        />
                        Yalnız davet
                      </label>
                    </div>
                  </div>
                )}
              </div>
              {canCreate && (
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                >
                  + Kullanıcı Ekle
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px]">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/40">
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                Kullanıcı
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                Rol
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                Durum
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                Son giriş
              </th>
              <th className="relative px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                İşlem
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center text-sm ui-text-muted">
                  Yükleniyor...
                </td>
              </tr>
            ) : listEmpty ? (
              <tr>
                <td colSpan={5} className="px-5 py-16">
                  <div className="mx-auto flex max-w-md flex-col items-center text-center">
                    <div className="mb-3 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)]/60 p-3 text-[var(--color-text-muted)]">
                      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                    {emptyFromFilters ? (
                      <>
                        <h3 className="text-base font-semibold text-[var(--color-text)]">Sonuç bulunamadı</h3>
                        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                          Arama veya filtrelerle eşleşen kullanıcı yok. Filtreleri sıfırlayın veya aramayı değiştirin.
                        </p>
                        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={clearFilters}
                            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/80 px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-hover)]"
                          >
                            Filtreleri temizle
                          </button>
                          {canCreate ? (
                            <button
                              type="button"
                              onClick={() => setShowCreateModal(true)}
                              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                            >
                              Kullanıcı ekle
                            </button>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <>
                        <h3 className="text-base font-semibold text-[var(--color-text)]">Henüz kullanıcı yok</h3>
                        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                          Sisteme davet edilmiş kullanıcılar burada listelenir. Yeni kullanıcı eklemek için davet gönderin.
                        </p>
                        {canCreate ? (
                          <button
                            type="button"
                            onClick={() => setShowCreateModal(true)}
                            className="mt-5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                          >
                            Kullanıcı ekle
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              displayUsers.map((u) => {
                const primary = getPrimaryRbacStatus(u);
                const metaLines = getRbacStatusMetaLines(u);
                const life = u.lifecycle_status ?? "active";
                const showQuickActions = isSystemOwner && life !== "archived";
                return (
                  <tr
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className={`cursor-pointer transition hover:bg-[var(--color-surface-hover)]/40 ${
                      selectedUserId === u.id ? "bg-[var(--color-primary)]/[0.06]" : ""
                    }`}
                  >
                    <td className="max-w-[min(320px,40vw)] px-5 py-4 align-top">
                      <p className="truncate text-sm font-medium text-[var(--color-text)]">{u.email ?? "—"}</p>
                      {u.linked_personnel ? (
                        <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">{u.linked_personnel}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        {getRoleLabel(u.role_level ?? null)}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${primaryRbacStatusClass(primary)}`}
                      >
                        {primaryRbacStatusLabel(primary)}
                      </span>
                      {metaLines.length > 0 ? (
                        <div className="mt-1.5 space-y-0.5">
                          {metaLines.map((line, i) => (
                            <p key={`${u.id}-meta-${i}`} className="text-[11px] leading-snug text-[var(--color-text-muted)]">
                              {line}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 align-top text-sm text-[var(--color-text-secondary)]">
                      {fmtShort(u.last_login_at)}
                    </td>
                    <td className="relative px-4 py-4 text-right align-top" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectUser(u);
                          }}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-hover)]"
                        >
                          Detay
                        </button>
                        {showQuickActions ? (
                          <>
                            <button
                              type="button"
                              disabled={adminActionBusy}
                              title="Daveti yeniden gönder"
                              aria-label="Daveti yeniden gönder"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleResendInviteFor(u);
                              }}
                              className="rounded-lg p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:opacity-40"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                />
                              </svg>
                            </button>
                            <button
                              type="button"
                              disabled={adminActionBusy}
                              title="Şifre sıfırlama bağlantısı oluştur ve panoya kopyala"
                              aria-label="Şifre sıfırlama bağlantısı"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handlePasswordResetLinkFor(u);
                              }}
                              className="rounded-lg p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:opacity-40"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                                />
                              </svg>
                            </button>
                            <button
                              type="button"
                              disabled={adminActionBusy || lifecycleBusy}
                              title={life === "passive" ? "Kullanıcıyı aktifleştir" : "Kullanıcıyı pasifleştir"}
                              aria-label={life === "passive" ? "Aktifleştir" : "Pasifleştir"}
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleToggleActive(u);
                              }}
                              className="rounded-lg p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:opacity-40"
                            >
                              {life === "passive" ? (
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              ) : (
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                  />
                                </svg>
                              )}
                            </button>
                          </>
                        ) : null}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuUserId((id) => (id === u.id ? null : u.id));
                            }}
                            className="rounded-lg p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                            aria-label="Diğer işlemler"
                            aria-expanded={openMenuUserId === u.id}
                          >
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                              <path d="M12 8a2 2 0 110-4 2 2 0 010 4zm0 2a2 2 0 110 4 2 2 0 010-4zm0 10a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                          <UserRowOverflowMenu
                            user={u}
                            isOpen={openMenuUserId === u.id}
                            onClose={() => setOpenMenuUserId(null)}
                            isSystemOwner={isSystemOwner}
                            currentUserId={currentUser?.id}
                            onEdit={() => handleSelectUser(u)}
                            onResendInvite={() => void handleResendInviteFor(u)}
                            onCopyInviteLink={() => void handleCopyInviteLinkFor(u)}
                            onPasswordReset={() => void handlePasswordResetLinkFor(u)}
                            onToggleActivePassive={() => void handleToggleActive(u)}
                            onArchive={() => void handleLifecycleArchiveFor(u)}
                            onRestore={() => void handleLifecycleRestoreFor(u)}
                            onPermanentDelete={() => setPermanentDeleteTarget(u)}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
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
            isSystemOwner={isSystemOwner}
            lifecycleBusy={lifecycleBusy}
            adminActionBusy={adminActionBusy}
            onLifecyclePassive={handleLifecyclePassive}
            onLifecycleRestore={handleLifecycleRestore}
            onLifecycleActivate={handleLifecycleActivate}
            onLifecycleArchive={handleLifecycleArchive}
            onResendInvite={handleResendInvite}
            onCopyInviteLink={handleCopyInviteLink}
            onPasswordResetLink={handlePasswordResetLink}
            currentUserId={currentUser?.id ?? null}
            onPermanentDelete={() => setPermanentDeleteTarget(selectedUser)}
            onClose={handleCloseDrawer}
          />,
          document.body
        )}

      {permanentDeleteTarget && typeof document !== "undefined" && (
        createPortal(
          <PermanentDeleteUserModal
            key={permanentDeleteTarget.id}
            user={permanentDeleteTarget}
            busy={permanentDeleteBusy}
            onClose={() => !permanentDeleteBusy && setPermanentDeleteTarget(null)}
            onConfirm={handlePermanentDeleteConfirm}
          />,
          document.body
        )
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
