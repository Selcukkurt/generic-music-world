"use client";

import { useState } from "react";
import { MOCK_USERS } from "@/lib/rbac/roleManagement/mockUsers";
import type { Role } from "@/lib/rbac/roleManagement/types";

type UserAssignModalProps = {
  isOpen: boolean;
  onClose: () => void;
  roles: Role[];
  assignments: { userId: string; roleId: string }[];
  onAssign: (userId: string, roleId: string) => void;
};

export default function UserAssignModal({
  isOpen,
  onClose,
  roles,
  assignments,
  onAssign,
}: UserAssignModalProps) {
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRole, setSelectedRole] = useState("");

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser && selectedRole) {
      onAssign(selectedUser, selectedRole);
      setSelectedUser("");
      setSelectedRole("");
      onClose();
    }
  };

  const getRoleForUser = (userId: string) =>
    assignments.find((a) => a.userId === userId)?.roleId ?? null;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-assign-title"
    >
      <div
        className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="user-assign-title" className="text-lg font-semibold text-[var(--color-text)]">
          Kullanıcı Ata
        </h2>
        <p className="mt-1 text-sm ui-text-muted">
          Bir kullanıcıya rol atayın. Mevcut atama güncellenir.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
              Kullanıcı
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="ui-input"
              required
            >
              <option value="">Seçin...</option>
              {MOCK_USERS.map((u) => {
                const roleId = getRoleForUser(u.id);
                const role = roleId ? roles.find((r) => r.id === roleId) : null;
                return (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.email})
                    {role ? ` – ${role.name}` : ""}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
              Rol
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="ui-input"
              required
            >
              <option value="">Seçin...</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2.5 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
            >
              İptal
            </button>
            <button
              type="submit"
              className="ui-button-primary flex-1 px-4 py-2.5 text-sm font-semibold"
            >
              Ata
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
