"use client";

import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { updateProfile } from "@/lib/personnel/data";
import type { Profile } from "@/lib/personnel/types";
import { ROLE_LABELS, ROLES } from "@/lib/personnel/types";

type Props = {
  profile: Profile;
  onClose: () => void;
  onUpdate: (profile: Profile) => void;
  canEdit: boolean;
};

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

export default function PersonnelDrawer({ profile, onClose, onUpdate, canEdit }: Props) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name: profile.full_name ?? "",
    role: profile.role,
    department: profile.department ?? "",
    team: profile.team ?? "",
    title: profile.title ?? "",
    phone: profile.phone ?? "",
    is_active: profile.is_active,
  });

  useEffect(() => {
    setForm({
      full_name: profile.full_name ?? "",
      role: profile.role,
      department: profile.department ?? "",
      team: profile.team ?? "",
      title: profile.title ?? "",
      phone: profile.phone ?? "",
      is_active: profile.is_active,
    });
  }, [profile.id]);

  const handleSave = useCallback(async () => {
    setSubmitting(true);
    try {
      await updateProfile(profile.id, {
        full_name: form.full_name.trim() || null,
        role: form.role as Profile["role"],
        department: form.department.trim() || null,
        team: form.team.trim() || null,
        title: form.title.trim() || null,
        phone: form.phone.trim() || null,
        is_active: form.is_active,
      });
      const updated: Profile = {
        ...profile,
        ...form,
        full_name: form.full_name.trim() || null,
        department: form.department.trim() || null,
        team: form.team.trim() || null,
        title: form.title.trim() || null,
        phone: form.phone.trim() || null,
      };
      onUpdate(updated);
      setEditing(false);
      toast.success("Tamamlandı", "Profil güncellendi.");
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Güncelleme başarısız.");
    } finally {
      setSubmitting(false);
    }
  }, [profile, form, onUpdate, toast]);

  return (
    <>
      <div
        className="fixed inset-0 z-[var(--z-modal)] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed right-0 top-0 z-[var(--z-modal)] flex h-full w-full max-w-md flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="personnel-drawer-title"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <h2 id="personnel-drawer-title" className="font-semibold text-[var(--color-text)]">
            Personel Detayı
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 ui-text-muted transition hover:bg-[var(--color-surface-hover)]"
            aria-label="Kapat"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-6 flex items-center gap-4">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface2)] text-xl font-medium ui-text-secondary">
                {getInitials(profile)}
              </span>
            )}
            <div>
              <p className="text-lg font-semibold text-[var(--color-text)]">
                {profile.full_name || profile.email || "—"}
              </p>
              {profile.email && (
                <p className="text-sm ui-text-muted">{profile.email}</p>
              )}
            </div>
          </div>

          {editing && canEdit ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Ad Soyad</label>
                <input
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="ui-input w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Rol</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Profile["role"] }))}
                  className="ui-input w-full"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Departman</label>
                <input
                  value={form.department}
                  onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                  className="ui-input w-full"
                  placeholder="örn: Operasyon"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Ekip</label>
                <input
                  value={form.team}
                  onChange={(e) => setForm((f) => ({ ...f, team: e.target.value }))}
                  className="ui-input w-full"
                  placeholder="Serbest metin"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Ünvan</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="ui-input w-full"
                  placeholder="örn: Ekip Lideri"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Telefon</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="ui-input w-full"
                  type="tel"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="rounded border-[var(--color-border)]"
                />
                <label htmlFor="is_active" className="text-sm ui-text-secondary">
                  Aktif
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={submitting}
                  className="ui-button-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {submitting ? "Kaydediliyor…" : "Kaydet"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium ui-text-muted">Rol</p>
                <p className="text-sm text-[var(--color-text)]">
                  {ROLE_LABELS[profile.role as keyof typeof ROLE_LABELS] ?? profile.role}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium ui-text-muted">Departman</p>
                <p className="text-sm text-[var(--color-text)]">{profile.department || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium ui-text-muted">Ekip</p>
                <p className="text-sm text-[var(--color-text)]">{profile.team || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium ui-text-muted">Ünvan</p>
                <p className="text-sm text-[var(--color-text)]">{profile.title || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium ui-text-muted">Telefon</p>
                <p className="text-sm text-[var(--color-text)]">{profile.phone || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium ui-text-muted">Durum</p>
                <p className="text-sm text-[var(--color-text)]">
                  {profile.is_active ? "Aktif" : "Pasif"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium ui-text-muted">Oluşturulma</p>
                <p className="text-sm ui-text-secondary">
                  {profile.created_at
                    ? new Date(profile.created_at).toLocaleString("tr-TR")
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium ui-text-muted">Son Görülme</p>
                <p className="text-sm ui-text-secondary">
                  {profile.last_seen_at
                    ? new Date(profile.last_seen_at).toLocaleString("tr-TR")
                    : "—"}
                </p>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
                >
                  Düzenle
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
