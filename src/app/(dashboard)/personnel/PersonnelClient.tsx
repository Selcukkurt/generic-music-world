"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/shell/PageHeader";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { canAccess } from "@/lib/rbac/canAccess";
import { useToast } from "@/components/ui/ToastProvider";
import { fetchProfiles, updateProfile } from "@/lib/personnel/data";
import type { Profile } from "@/lib/personnel/types";
import { ROLE_LABELS, ROLES } from "@/lib/personnel/types";
import PersonnelDrawer from "./PersonnelDrawer";

function getInitials(profile: Profile): string {
  if (profile.full_name?.trim()) {
    const parts = profile.full_name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return profile.full_name.slice(0, 2).toUpperCase();
  }
  if (profile.email) {
    return profile.email.slice(0, 2).toUpperCase();
  }
  return "?";
}

export default function PersonnelClient() {
  const toast = useToast();
  const { user } = useCurrentUser();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active");
  const [selected, setSelected] = useState<Profile | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const canManage = user ? canAccess(user.role, "personnel", "manage") : false;
  const isAdmin = user ? ["system_owner", "ceo", "admin"].includes(user.role) : false;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchProfiles({
        search: appliedSearch.trim() || undefined,
        role: roleFilter !== "all" ? roleFilter : undefined,
        department: departmentFilter !== "all" ? departmentFilter : undefined,
        status: statusFilter,
      });
      setProfiles(list);
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Personel listesi yüklenemedi.");
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, roleFilter, departmentFilter, statusFilter, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdate = useCallback(
    (updated: Profile) => {
      setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      if (selected?.id === updated.id) setSelected(updated);
    },
    [selected?.id]
  );

  const handleToggleActive = useCallback(
    async (profile: Profile) => {
      if (!canManage || !user || profile.id === user.id) return;
      const newActive = !profile.is_active;
      setProfiles((prev) =>
        prev.map((p) => (p.id === profile.id ? { ...p, is_active: newActive } : p))
      );
      if (selected?.id === profile.id) setSelected({ ...selected, is_active: newActive });
      try {
        await updateProfile(profile.id, { is_active: newActive });
        toast.success("Tamamlandı", newActive ? "Personel aktif edildi." : "Personel pasif edildi.");
      } catch {
        setProfiles((prev) =>
          prev.map((p) => (p.id === profile.id ? { ...p, is_active: profile.is_active } : p))
        );
        if (selected?.id === profile.id) setSelected(selected);
        toast.error("Hata", "Güncelleme başarısız.");
      }
    },
    [canManage, user, selected, toast]
  );

  const departments = Array.from(new Set(profiles.map((p) => p.department).filter(Boolean))) as string[];

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Personel Listesi"
        subtitle="Ekibini görüntüle, filtrele ve yetki/ekip bilgilerini yönet."
      >
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), setAppliedSearch(search))}
            className="ui-input w-40 py-2 text-sm"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="ui-input w-36 py-2 text-sm"
          >
            <option value="all">Tümü</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="ui-input w-36 py-2 text-sm"
          >
            <option value="all">Departman</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "active" | "inactive" | "all")}
            className="ui-input w-28 py-2 text-sm"
          >
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
            <option value="all">Tümü</option>
          </select>
          <button
            type="button"
            onClick={() => setAppliedSearch(search)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
          >
            Filtrele
          </button>
          {isAdmin && (
            <Link
              href="/personnel-settings"
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
            >
              Personel Ayarları
            </Link>
          )}
          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            className="ui-button-primary rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Yeni Personel / Davet Gönder
          </button>
        </div>
      </PageHeader>

      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden backdrop-blur-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-surface2)]" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <p className="text-sm font-medium text-[var(--color-text)]">
              {appliedSearch || roleFilter !== "all" || departmentFilter !== "all" || statusFilter !== "active"
                ? "Bu filtrelerde sonuç yok."
                : "Henüz personel yok."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Personel</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Rol</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Departman</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Ekip</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Durum</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Son Görülme</th>
                  <th className="px-4 py-3 text-right text-xs font-medium ui-text-muted">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => (
                  <tr
                    key={profile.id}
                    className="border-b border-[var(--color-border)] transition hover:bg-[var(--color-surface-hover)]/30"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {profile.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface2)] text-xs font-medium ui-text-secondary">
                            {getInitials(profile)}
                          </span>
                        )}
                        <div>
                          <p className="font-medium text-[var(--color-text)]">
                            {profile.full_name || profile.email || "—"}
                          </p>
                          {profile.email && (
                            <p className="text-xs ui-text-muted">{profile.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-[var(--color-surface2)] ui-text-secondary">
                        {ROLE_LABELS[profile.role as keyof typeof ROLE_LABELS] ?? profile.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm ui-text-secondary">{profile.department || "—"}</td>
                    <td className="px-4 py-3 text-sm ui-text-secondary">{profile.team || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          profile.is_active ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-500/20 text-slate-400"
                        }`}
                      >
                        {profile.is_active ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs ui-text-muted">
                      {profile.last_seen_at
                        ? new Date(profile.last_seen_at).toLocaleDateString("tr-TR")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelected(profile)}
                          className="rounded px-2 py-1 text-xs font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                        >
                          Detay
                        </button>
                        {canManage && profile.id !== user?.id && (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(profile)}
                            className="rounded px-2 py-1 text-xs font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                          >
                            {profile.is_active ? "Pasif Yap" : "Aktif Yap"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <PersonnelDrawer
          profile={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
          canEdit={canManage && selected.id !== user?.id}
        />
      )}

      {showInviteModal && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowInviteModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Yeni Personel / Davet</h2>
            <p className="mt-2 text-sm ui-text-muted">
              Davet gönderme özelliği yakında eklenecek. Şimdilik personel eklemek için Supabase Auth üzerinden kullanıcı oluşturabilirsiniz.
            </p>
            <button
              type="button"
              onClick={() => setShowInviteModal(false)}
              className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

