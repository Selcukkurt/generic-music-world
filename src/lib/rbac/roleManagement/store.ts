import type { Role, Permission, UserAssignment, ModuleKey } from "./types";
import { MODULE_KEYS, MODULE_LABELS } from "./types";

const STORAGE_KEY = "gmw_role_management";

const SUPER_ADMIN_ID = "super_admin";

function createDefaultRole(overrides: Partial<Role> & Pick<Role, "id" | "name" | "description" | "level">): Role {
  const now = new Date().toISOString();
  return {
    id: overrides.id,
    name: overrides.name,
    description: overrides.description,
    level: overrides.level,
    isLocked: overrides.isLocked ?? false,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

function createDefaultPermissions(roleId: string): Permission[] {
  const allTrue = MODULE_KEYS.map((moduleKey) => ({
    roleId,
    moduleKey,
    canRead: true,
    canWrite: true,
  }));
  if (roleId === SUPER_ADMIN_ID) return allTrue;
  if (roleId === "admin") return allTrue;
  if (roleId === "manager") {
    return MODULE_KEYS.map((moduleKey, i) => ({
      roleId,
      moduleKey,
      canRead: true,
      canWrite: i < 4,
    }));
  }
  if (roleId === "editor") {
    return MODULE_KEYS.map((moduleKey, i) => ({
      roleId,
      moduleKey,
      canRead: true,
      canWrite: i < 3,
    }));
  }
  if (roleId === "viewer") {
    return MODULE_KEYS.map((moduleKey, i) => ({
      roleId,
      moduleKey,
      canRead: i < 2,
      canWrite: false,
    }));
  }
  return MODULE_KEYS.map((moduleKey) => ({
    roleId,
    moduleKey,
    canRead: false,
    canWrite: false,
  }));
}

export const DEFAULT_ROLES: Role[] = [
  createDefaultRole({
    id: SUPER_ADMIN_ID,
    name: "Super Admin",
    description: "Tam sistem erişimi. Tüm modüllere ve sistem ayarlarına erişebilir.",
    level: 5,
    isLocked: true,
  }),
  createDefaultRole({
    id: "admin",
    name: "Admin",
    description: "Tam iş erişimi. Modülleri ve personeli yönetebilir.",
    level: 4,
  }),
  createDefaultRole({
    id: "manager",
    name: "Manager",
    description: "Operasyonel erişim. Günlük işlemleri yönetebilir.",
    level: 3,
  }),
  createDefaultRole({
    id: "editor",
    name: "Editor",
    description: "Sınırlı erişim. Belirli modüllerde düzenleme yapabilir.",
    level: 2,
  }),
  createDefaultRole({
    id: "viewer",
    name: "Viewer",
    description: "Sadece okuma. İçerikleri görüntüleyebilir, düzenleyemez.",
    level: 1,
  }),
];

export function getDefaultPermissions(): Permission[] {
  const perms: Permission[] = [];
  for (const role of DEFAULT_ROLES) {
    perms.push(...createDefaultPermissions(role.id));
  }
  return perms;
}

export type StoreState = {
  roles: Role[];
  permissions: Permission[];
  userAssignments: UserAssignment[];
};

/** Default state – safe for SSR, no localStorage access. */
export function getDefaultState(): StoreState {
  return {
    roles: DEFAULT_ROLES,
    permissions: getDefaultPermissions(),
    userAssignments: [],
  };
}

/** Load from localStorage – call only on client (e.g. in useEffect). */
export function loadState(): StoreState {
  if (typeof window === "undefined") {
    return getDefaultState();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw) as Partial<StoreState>;
    const roles = Array.isArray(parsed.roles) && parsed.roles.length > 0 ? parsed.roles : DEFAULT_ROLES;
    const permissions = Array.isArray(parsed.permissions) && parsed.permissions.length > 0 ? parsed.permissions : getDefaultPermissions();
    const userAssignments = Array.isArray(parsed.userAssignments) ? parsed.userAssignments : [];
    return { roles, permissions, userAssignments };
  } catch {
    return getDefaultState();
  }
}

export function saveState(state: StoreState): void {
  if (typeof window === "undefined") return;
  try {
    if (state && typeof state === "object") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // Safari private mode / quota exceeded – ignore
  }
}

export function getUserCountByRole(assignments: UserAssignment[], roleId: string): number {
  return assignments.filter((a) => a.roleId === roleId).length;
}

export function getPermissionsForRole(permissions: Permission[], roleId: string): Permission[] {
  return permissions.filter((p) => p.roleId === roleId);
}

export function hasModuleAccess(permissions: Permission[], roleId: string, moduleKey: ModuleKey): boolean {
  const p = permissions.find((x) => x.roleId === roleId && x.moduleKey === moduleKey);
  return p ? p.canRead || p.canWrite : false;
}

export { MODULE_KEYS, MODULE_LABELS };
