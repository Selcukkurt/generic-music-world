export type RoleLevel = 1 | 2 | 3 | 4 | 5;

export type Role = {
  id: string;
  name: string;
  description: string;
  level: RoleLevel;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
};

export const MODULE_KEYS = [
  "gmw_hub",
  "gm_dna",
  "gmw_pulse",
  "log_kayitlari",
  "bildirimler",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  gmw_hub: "GMW HUB",
  gm_dna: "GM DNA",
  gmw_pulse: "GMW Pulse",
  log_kayitlari: "Log Kayıtları",
  bildirimler: "Bildirimler",
};

export type Permission = {
  roleId: string;
  moduleKey: ModuleKey;
  canRead: boolean;
  canWrite: boolean;
};

export type UserAssignment = {
  userId: string;
  roleId: string;
  assignedAt: string;
};

export type MockUser = {
  id: string;
  email: string;
  fullName: string;
};

export const LEVEL_LABELS: Record<RoleLevel, string> = {
  1: "Level 1 – Read Only",
  2: "Level 2 – Limited",
  3: "Level 3 – Operational",
  4: "Level 4 – Full Access",
  5: "Level 5 – System",
};
