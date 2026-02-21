"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Role, Permission, UserAssignment, ModuleKey, RoleLevel } from "./types";
import {
  loadState,
  saveState,
  getDefaultState,
  getUserCountByRole,
  getPermissionsForRole,
  type StoreState,
} from "./store";

type RoleStoreValue = {
  roles: Role[];
  permissions: Permission[];
  userAssignments: UserAssignment[];
  getUserCount: (roleId: string) => number;
  getRolePermissions: (roleId: string) => Permission[];
  createRole: (data: { name: string; description: string; level: RoleLevel }) => Role | null;
  updateRole: (id: string, data: Partial<Pick<Role, "name" | "description" | "level">>) => Role | null;
  deleteRole: (id: string) => boolean;
  assignUserToRole: (userId: string, roleId: string) => void;
  unassignUser: (userId: string) => void;
  getUsersForRole: (roleId: string) => UserAssignment[];
  updatePermission: (roleId: string, moduleKey: ModuleKey, canRead: boolean, canWrite: boolean) => void;
  getPermissionState: (roleId: string, moduleKey: ModuleKey) => { canRead: boolean; canWrite: boolean };
  resetPermissions: (roleId: string) => void;
};

const RoleStoreContext = createContext<RoleStoreValue | null>(null);

export function RoleStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(getDefaultState);

  useEffect(() => {
    const loaded = loadState();
    queueMicrotask(() => setState(loaded));
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const getUserCount = useCallback(
    (roleId: string) => getUserCountByRole(state.userAssignments, roleId),
    [state.userAssignments]
  );

  const getRolePermissions = useCallback(
    (roleId: string) => getPermissionsForRole(state.permissions, roleId),
    [state.permissions]
  );

  const createRole = useCallback(
    (data: { name: string; description: string; level: RoleLevel }): Role | null => {
      const nameTrimmed = data.name.trim();
      if (!nameTrimmed) return null;
      const exists = state.roles.some(
        (r) => r.name.toLowerCase() === nameTrimmed.toLowerCase()
      );
      if (exists) return null;

      const id = `role_${Date.now()}`;
      const now = new Date().toISOString();
      const role: Role = {
        id,
        name: nameTrimmed,
        description: data.description.trim(),
        level: data.level,
        isLocked: false,
        createdAt: now,
        updatedAt: now,
      };

      const perms = ["gmw_hub", "gm_dna", "gmw_pulse", "log_kayitlari", "bildirimler"].map(
        (moduleKey) => ({
          roleId: id,
          moduleKey: moduleKey as ModuleKey,
          canRead: false,
          canWrite: false,
        })
      );

      setState((prev) => ({
        ...prev,
        roles: [...prev.roles, role],
        permissions: [...prev.permissions, ...perms],
      }));
      return role;
    },
    [state.roles]
  );

  const updateRole = useCallback(
    (
      id: string,
      data: Partial<Pick<Role, "name" | "description" | "level">>
    ): Role | null => {
      const role = state.roles.find((r) => r.id === id);
      if (!role || role.isLocked) return null;

      const nameTrimmed = data.name?.trim();
      if (nameTrimmed !== undefined) {
        const exists = state.roles.some(
          (r) => r.id !== id && r.name.toLowerCase() === nameTrimmed.toLowerCase()
        );
        if (exists) return null;
      }

      const updated: Role = {
        ...role,
        ...(data.name !== undefined && { name: nameTrimmed ?? role.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.level !== undefined && { level: data.level }),
        updatedAt: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        roles: prev.roles.map((r) => (r.id === id ? updated : r)),
      }));
      return updated;
    },
    [state.roles]
  );

  const deleteRole = useCallback((id: string): boolean => {
    const role = state.roles.find((r) => r.id === id);
    if (!role || role.isLocked) return false;

    setState((prev) => ({
      ...prev,
      roles: prev.roles.filter((r) => r.id !== id),
      permissions: prev.permissions.filter((p) => p.roleId !== id),
      userAssignments: prev.userAssignments.filter((a) => a.roleId !== id),
    }));
    return true;
  }, [state.roles]);

  const assignUserToRole = useCallback((userId: string, roleId: string) => {
    const now = new Date().toISOString();
    setState((prev) => {
      const filtered = prev.userAssignments.filter((a) => a.userId !== userId);
      return {
        ...prev,
        userAssignments: [...filtered, { userId, roleId, assignedAt: now }],
      };
    });
  }, []);

  const unassignUser = useCallback((userId: string) => {
    setState((prev) => ({
      ...prev,
      userAssignments: prev.userAssignments.filter((a) => a.userId !== userId),
    }));
  }, []);

  const getUsersForRole = useCallback(
    (roleId: string) =>
      state.userAssignments.filter((a) => a.roleId === roleId),
    [state.userAssignments]
  );

  const updatePermission = useCallback(
    (roleId: string, moduleKey: ModuleKey, canRead: boolean, canWrite: boolean) => {
      const role = state.roles.find((r) => r.id === roleId);
      if (role?.isLocked) return;

      setState((prev) => {
        const rest = prev.permissions.filter(
          (p) => !(p.roleId === roleId && p.moduleKey === moduleKey)
        );
        return {
          ...prev,
          permissions: [
            ...rest,
            { roleId, moduleKey, canRead, canWrite },
          ],
        };
      });
    },
    [state.roles]
  );

  const getPermissionState = useCallback(
    (roleId: string, moduleKey: ModuleKey) => {
      const p = state.permissions.find(
        (x) => x.roleId === roleId && x.moduleKey === moduleKey
      );
      return {
        canRead: p?.canRead ?? false,
        canWrite: p?.canWrite ?? false,
      };
    },
    [state.permissions]
  );

  const resetPermissions = useCallback((roleId: string) => {
    const role = state.roles.find((r) => r.id === roleId);
    if (role?.isLocked) return;

    setState((prev) => {
      const rest = prev.permissions.filter((p) => p.roleId !== roleId);
      const defaults = ["gmw_hub", "gm_dna", "gmw_pulse", "log_kayitlari", "bildirimler"].map(
        (mk) => ({
          roleId,
          moduleKey: mk as ModuleKey,
          canRead: false,
          canWrite: false,
        })
      );
      return { ...prev, permissions: [...rest, ...defaults] };
    });
  }, [state.roles]);

  const value = useMemo<RoleStoreValue>(
    () => ({
      roles: state.roles,
      permissions: state.permissions,
      userAssignments: state.userAssignments,
      getUserCount,
      getRolePermissions,
      createRole,
      updateRole,
      deleteRole,
      assignUserToRole,
      unassignUser,
      getUsersForRole,
      updatePermission,
      getPermissionState,
      resetPermissions,
    }),
    [
      state.roles,
      state.permissions,
      state.userAssignments,
      getUserCount,
      getRolePermissions,
      createRole,
      updateRole,
      deleteRole,
      assignUserToRole,
      unassignUser,
      getUsersForRole,
      updatePermission,
      getPermissionState,
      resetPermissions,
    ]
  );

  return (
    <RoleStoreContext.Provider value={value}>
      {children}
    </RoleStoreContext.Provider>
  );
}

export function useRoleStore() {
  const ctx = useContext(RoleStoreContext);
  if (!ctx) {
    throw new Error("useRoleStore must be used within RoleStoreProvider");
  }
  return ctx;
}
