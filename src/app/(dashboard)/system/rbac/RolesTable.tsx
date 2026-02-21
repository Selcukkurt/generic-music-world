"use client";

import { useRoleStore } from "@/lib/rbac/roleManagement/RoleStoreContext";
import { LEVEL_LABELS } from "@/lib/rbac/roleManagement/types";
import type { Role } from "@/lib/rbac/roleManagement/types";

type RolesTableProps = {
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
  onUserAssign: () => void;
};

export default function RolesTable({
  onEdit,
  onDelete,
  onUserAssign,
}: RolesTableProps) {
  const { roles, getUserCount } = useRoleStore();

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 shadow-[var(--shadow-soft)] backdrop-blur-sm">
      <div className="border-b border-[var(--color-border)] px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-[var(--color-text)]">
            Roller
          </h2>
          <button
            type="button"
            onClick={onUserAssign}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
          >
            Kullanıcı Ata
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Rol Adı
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Açıklama
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Kullanıcı Sayısı
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Yetki Seviyesi
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                İşlem
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {roles.map((role) => (
              <tr
                key={role.id}
                className="transition hover:bg-[var(--color-surface-hover)]/50"
              >
                <td className="px-4 py-3.5 sm:px-6">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--color-text)]">
                      {role.name}
                    </span>
                    {role.isLocked && (
                      <span
                        className="inline-flex items-center rounded border border-[var(--color-border)] bg-[var(--color-surface2)] px-1.5 py-0.5 text-[10px] font-medium ui-text-muted"
                        title="Bu rol silinemez ve düzenlenemez"
                      >
                        Kilitli
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-sm ui-text-secondary sm:px-6">
                  {role.description}
                </td>
                <td className="px-4 py-3.5 text-sm ui-text-secondary sm:px-6">
                  {getUserCount(role.id)}
                </td>
                <td className="px-4 py-3.5 sm:px-6">
                  <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)]/60 px-2.5 py-1 text-xs ui-text-muted">
                    {LEVEL_LABELS[role.level]}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right sm:px-6">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(role)}
                      disabled={role.isLocked}
                      className="rounded px-2 py-1 text-xs font-medium ui-text-muted transition hover:bg-[var(--color-surface2)] hover:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Düzenle
                    </button>
                    {!role.isLocked && (
                      <button
                        type="button"
                        onClick={() => onDelete(role)}
                        className="rounded px-2 py-1 text-xs font-medium text-[var(--color-danger)] transition hover:bg-[var(--color-surface2)]"
                      >
                        Sil
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
