"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/components/shell/PageHeader";
import {
  fetchUsers,
  fetchRoles,
  updateUser,
  assignUserRoles,
  inviteUser,
} from "@/lib/rbac-v1/api";
import type { AppUserWithRoles, Role } from "@/lib/rbac-v1/types";
import { useI18n } from "@/i18n/LocaleProvider";
import { useToast } from "@/components/ui/ToastProvider";

export default function PeopleOpsUsersPage() {
  const { t } = useI18n();
  const toast = useToast();
  const [users, setUsers] = useState<AppUserWithRoles[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUserWithRoles | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const loadData = () => {
    setLoading(true);
    (async () => {
      const [uOut, rOut] = await Promise.allSettled([fetchUsers(search, activeFilter), fetchRoles()]);
      if (uOut.status === "rejected") {
        console.error("[PeopleOpsUsers] fetchUsers:", uOut.reason);
        toast.error("Yüklenemedi", uOut.reason instanceof Error ? uOut.reason.message : "Kullanıcılar alınamadı.");
        setUsers([]);
        setRoles([]);
        return;
      }
      setUsers(uOut.value);
      if (rOut.status === "fulfilled") setRoles(rOut.value);
      else {
        console.error("[PeopleOpsUsers] fetchRoles:", rOut.reason);
        setRoles([]);
      }
    })().finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [search, activeFilter]);

  const handleSelectUser = (u: AppUserWithRoles) => {
    setSelectedUser(u);
    setEditFullName(u.full_name ?? "");
    setEditActive(u.is_active);
    setSelectedRoleIds(new Set(u.roles.map((r) => r.id)));
  };

  const handleCloseEdit = () => {
    setSelectedUser(null);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteSubmitting(true);
    try {
      await inviteUser({
        email: inviteEmail.trim(),
        role_id: inviteRoleId || undefined,
      });
      toast.success("Davet gönderildi", `${inviteEmail} adresine davet e-postası gönderildi.`);
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteRoleId("");
      loadData();
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Davet gönderilemedi.");
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    setEditSubmitting(true);
    try {
      await updateUser(selectedUser.id, {
        full_name: editFullName.trim() || undefined,
        is_active: editActive,
      });
      await assignUserRoles(selectedUser.id, Array.from(selectedRoleIds));
      setUsers((prev) =>
        prev.map((x) => {
          if (x.id !== selectedUser.id) return x;
          const newRoles = roles.filter((r) => selectedRoleIds.has(r.id));
          return { ...x, full_name: editFullName.trim() || x.full_name, is_active: editActive, roles: newRoles };
        })
      );
      setSelectedUser({ ...selectedUser, full_name: editFullName.trim(), is_active: editActive, roles: roles.filter((r) => selectedRoleIds.has(r.id)) });
      toast.success("Kaydedildi", "Kullanıcı güncellendi.");
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setEditSubmitting(false);
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

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title={t("peopleops_users")}
        subtitle="Kullanıcıları yönetin, davet edin ve roller atayın."
      />

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80">
        <div className="border-b border-[var(--color-border)] px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                + {t("peopleops_users_add")}
              </button>
              <select
                value={activeFilter === null ? "all" : activeFilter ? "true" : "false"}
                onChange={(e) => {
                  const v = e.target.value;
                  setActiveFilter(v === "all" ? null : v === "true");
                }}
                className="ui-input w-auto text-sm"
              >
                <option value="all">{t("peopleops_users_filter_all")}</option>
                <option value="true">{t("peopleops_users_filter_active")}</option>
                <option value="false">{t("peopleops_users_filter_inactive")}</option>
              </select>
            </div>
            <input
              type="search"
              placeholder={t("peopleops_users_search")}
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
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase ui-text-muted">
                    {t("peopleops_users_name")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase ui-text-muted">
                    {t("peopleops_users_email")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase ui-text-muted">
                    {t("peopleops_users_roles")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase ui-text-muted">
                    {t("peopleops_users_status")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase ui-text-muted">
                    {t("peopleops_users_actions")}
                  </th>
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
                      <td className="px-4 py-3 text-sm">{u.full_name ?? "—"}</td>
                      <td className="px-4 py-3 text-sm">{u.email ?? "—"}</td>
                      <td className="px-4 py-3 text-sm">
                        {u.roles.map((r) => r.name_tr ?? r.key).join(", ") || "—"}
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
                          className="rounded px-2 py-1 text-xs font-medium text-amber-400 hover:bg-amber-500/20"
                        >
                          {t("peopleops_users_edit")}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {selectedUser && (
            <div className="w-80 shrink-0 border-l border-[var(--color-border)] p-4">
              <h3 className="mb-3 text-sm font-semibold">{t("peopleops_users_edit_panel_title")}</h3>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium ui-text-muted">
                    {t("peopleops_users_name")}
                  </label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="ui-input w-full text-sm"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Aktif</span>
                </label>
                <div>
                  <h4 className="mb-2 text-xs font-medium ui-text-muted">
                    {t("peopleops_users_assign_roles")}
                  </h4>
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
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className="flex-1 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-surface-hover)]"
                >
                  {t("peopleops_users_cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={editSubmitting}
                  className="flex-1 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {editSubmitting ? "..." : t("peopleops_users_save")}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {showInviteModal && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowInviteModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-[var(--color-text)]">
              {t("peopleops_users_invite_modal_title")}
            </h2>
            <p className="mt-1 text-sm ui-text-muted">
              E-posta ile davet gönderin. Kullanıcı hesabı oluşturulacak ve varsayılan rol atanacak.
            </p>
            <form onSubmit={handleInviteSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
                  {t("peopleops_users_invite_email")} *
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="ui-input w-full"
                  required
                  placeholder="ornek@firma.com"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
                  {t("peopleops_users_invite_role")}
                </label>
                <select
                  value={inviteRoleId}
                  onChange={(e) => setInviteRoleId(e.target.value)}
                  className="ui-input w-full"
                >
                  <option value="">Seçin...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name_tr ?? r.key}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium hover:bg-[var(--color-surface-hover)]"
                >
                  {t("peopleops_users_cancel")}
                </button>
                <button
                  type="submit"
                  disabled={inviteSubmitting}
                  className="flex-1 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {inviteSubmitting ? "Gönderiliyor..." : "Davet Gönder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
