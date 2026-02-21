"use client";

import { useState, useCallback } from "react";
import { useRoleStore } from "@/lib/rbac/roleManagement/RoleStoreContext";
import { MODULE_KEYS, MODULE_LABELS, type ModuleKey } from "@/lib/rbac/roleManagement/types";
import { useToast } from "@/components/ui/ToastProvider";
import Checkbox from "@/components/ui/Checkbox";

const SUPER_ADMIN_ID = "super_admin";

export default function PermissionMatrix() {
  const toast = useToast();
  const { roles, getPermissionState, updatePermission } = useRoleStore();

  const [draft, setDraft] = useState<Record<string, Record<string, boolean>>>({});
  const [isDirty, setIsDirty] = useState(false);

  const getCellValue = useCallback(
    (roleId: string, moduleKey: ModuleKey): boolean => {
      if (draft[roleId]?.[moduleKey] !== undefined) {
        return draft[roleId][moduleKey];
      }
      const p = getPermissionState(roleId, moduleKey);
      return p.canRead || p.canWrite;
    },
    [draft, getPermissionState]
  );

  const handleToggle = useCallback(
    (roleId: string, moduleKey: ModuleKey) => {
      const role = roles.find((r) => r.id === roleId);
      if (role?.isLocked) return;

      const current = getCellValue(roleId, moduleKey);
      const next = !current;

      setDraft((prev) => ({
        ...prev,
        [roleId]: {
          ...prev[roleId],
          [moduleKey]: next,
        },
      }));
      setIsDirty(true);
    },
    [roles, getCellValue]
  );

  const handleSave = useCallback(() => {
    for (const roleId of Object.keys(draft)) {
      const role = roles.find((r) => r.id === roleId);
      if (role?.isLocked) continue;

      for (const moduleKey of Object.keys(draft[roleId] ?? {}) as ModuleKey[]) {
        const checked = draft[roleId][moduleKey];
        updatePermission(roleId, moduleKey, checked, checked);
      }
    }
    setDraft({});
    setIsDirty(false);
    toast.success("Yetkiler kaydedildi", "Rol yetki matrisi güncellendi.");
  }, [draft, roles, updatePermission, toast]);

  const handleDiscard = useCallback(() => {
    setDraft({});
    setIsDirty(false);
  }, []);

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 shadow-[var(--shadow-soft)] backdrop-blur-sm">
      <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text)]">
            Yetki Matrisi
          </h2>
          <p className="mt-1 text-sm ui-text-muted">
            Modül bazlı rol yetkileri. Değişiklikleri kaydetmek için &quot;Kaydet&quot; butonuna tıklayın.
          </p>
        </div>
        {isDirty && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDiscard}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-3 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="ui-button-primary rounded-lg px-4 py-2 text-sm font-semibold"
            >
              Kaydet
            </button>
          </div>
        )}
      </div>
      <div className="overflow-x-auto p-4 sm:p-6">
        <div className="min-w-[600px]">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border-b border-r border-[var(--color-border)] bg-[var(--color-bg)]/50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted">
                  Modül
                </th>
                {roles.map((role) => (
                  <th
                    key={role.id}
                    className="border-b border-[var(--color-border)] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider ui-text-muted"
                  >
                    {role.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULE_KEYS.map((moduleKey) => (
                <tr
                  key={moduleKey}
                  className="border-b border-[var(--color-border)] transition hover:bg-[var(--color-surface-hover)]/30"
                >
                  <td className="border-r border-[var(--color-border)] px-4 py-3 text-sm font-medium text-[var(--color-text)]">
                    {MODULE_LABELS[moduleKey]}
                  </td>
                  {roles.map((role) => {
                    const checked = getCellValue(role.id, moduleKey);
                    const isLocked = role.id === SUPER_ADMIN_ID;
                    return (
                      <td key={role.id} className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={checked}
                            disabled={isLocked}
                            onChange={() => handleToggle(role.id, moduleKey)}
                            aria-label={`${MODULE_LABELS[moduleKey]} – ${role.name}`}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
