/**
 * RBAC role hierarchy and Turkish role names.
 * Uses profiles.role_level as the main hierarchy source.
 */

/** Role level (profiles.role_level). Lower = higher authority. */
export const ROLE_LEVEL = {
  SUPER_ADMIN_DEV: 0,
  CEO: 1,
  COO: 2,
  DIRECTOR: 3,
  MANAGER: 4,
  FIELD_STAFF: 5,
  OBSERVER: 6,
} as const;

export type RoleLevel = (typeof ROLE_LEVEL)[keyof typeof ROLE_LEVEL];

/** Role code keys for profiles.role (by level). */
export const ROLE_CODES: Record<number, string> = {
  0: "SUPER_ADMIN_DEV",
  1: "CEO",
  2: "COO",
  3: "DIRECTOR",
  4: "MANAGER",
  5: "FIELD_STAFF",
  6: "OBSERVER",
};

/** Level 0,1,2 = System Access (can access /system/rbac). */
export const SYSTEM_ACCESS_LEVELS = [0, 1, 2] as const;

/** Display labels for each role level (Turkish, single source of truth for UI). */
export const ROLE_LABELS: Record<number, string> = {
  0: "Super Admin (Dev)",
  1: "CEO (Founder)",
  2: "COO",
  3: "Direktör",
  4: "Yönetici",
  5: "Saha Personeli / Uzman",
  6: "Gözlemci / Ortak",
};

/** UI badges: 5 = no login, 6 = read only. */
export const ROLE_BADGES: Record<number, string | null> = {
  0: null,
  1: null,
  2: null,
  3: null,
  4: null,
  5: "Giriş Yok",
  6: "Salt Okunur",
};

/** Profile shape from DB (role_level primary, role fallback). */
export type RBACProfile = {
  role_level?: number | null;
  role?: string | null;
  can_login?: boolean | null;
  /** Assigned module IDs for Director (optional). */
  assigned_modules?: string[] | null;
};

/** Routes restricted to Super Admin, CEO, COO only. */
export const SYSTEM_RBAC_ROUTES = ["/system/rbac"] as const;

/** Routes that require Super Admin only (hidden system menus). */
export const SUPER_ADMIN_ONLY_ROUTES = [
  "/system/settings",
  "/system/release",
  "/system/security",
  "/system/migration",
  "/audit-log",
] as const;

/** Legacy role (profiles.role, roles.key) → role_level. */
export const LEGACY_ROLE_TO_LEVEL: Record<string, number> = {
  owner: 1,
  admin: 0,
  super_admin: 0,
  system_owner: 0,
  ceo: 1,
  coo: 2,
  director: 3,
  lead: 3,
  direktor: 3,
  manager: 4,
  admin_legacy: 4,
  staff: 4,
  yonetici: 4,
  field: 5,
  staff_field: 5,
  saha: 5,
  saha_personeli: 5,
  viewer: 6,
  gozlemci: 6,
  ortak: 6,
};

/** Role level → DB role key for permission editing (Roles tab). */
export const LEVEL_TO_ROLE_KEY: Record<number, string> = {
  0: "admin",
  1: "owner",
  2: "admin",
  3: "director",
  4: "manager",
  5: "field",
  6: "viewer",
};

/** DB role key → Turkish display label (single source of truth for role names in UI). */
export const ROLE_KEY_TO_LABEL: Record<string, string> = {
  admin: "Super Admin (Dev)",
  super_admin: "Super Admin (Dev)",
  system_owner: "Super Admin (Dev)",
  owner: "CEO (Founder)",
  ceo: "CEO (Founder)",
  coo: "COO",
  director: "Direktör",
  direktor: "Direktör",
  lead: "Direktör",
  manager: "Yönetici",
  yonetici: "Yönetici",
  admin_legacy: "Yönetici",
  staff: "Yönetici",
  field: "Saha Personeli / Uzman",
  saha: "Saha Personeli / Uzman",
  saha_personeli: "Saha Personeli / Uzman",
  staff_field: "Saha Personeli / Uzman",
  viewer: "Gözlemci / Ortak",
  gozlemci: "Gözlemci / Ortak",
  ortak: "Gözlemci / Ortak",
};

/** Static hierarchy for Roles tab display (business rules + Turkish labels). */
export const ROLE_HIERARCHY_DISPLAY = [
  { level: 0, label: ROLE_LABELS[0], badge: ROLE_BADGES[0], description: "Tüm modüllere erişim, gizli sistem menüleri, veritabanı. İş hiyerarşisinden bağımsız." },
  { level: 1, label: ROLE_LABELS[1], badge: ROLE_BADGES[1], description: "Tam yetki, onay ve son karar yetkisi." },
  { level: 2, label: ROLE_LABELS[2], badge: ROLE_BADGES[2], description: "CEO'dan sonra en yüksek operasyon yetkilisi. Modülde Direktör yoksa otorite COO'ya düşer." },
  { level: 3, label: ROLE_LABELS[3], badge: ROLE_BADGES[3], description: "Atanan modüllerde (M01–M12) tam yönetim yetkisi." },
  { level: 4, label: ROLE_LABELS[4], badge: ROLE_BADGES[4], description: "Kendi operasyon kapsamıyla sınırlı. Genel sistem yöneticisi değil." },
  { level: 5, label: ROLE_LABELS[5], badge: ROLE_BADGES[5], description: "Sisteme giriş yok. Barmen, garson, teknik ekip gibi saha personeli. Sadece personel kayıtlarında." },
  { level: 6, label: ROLE_LABELS[6], badge: ROLE_BADGES[6], description: "Salt okunur. Atanan kayıtlar/etkinliklere sadece görüntüleme." },
] as const;
