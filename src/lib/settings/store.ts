import type {
  SystemSettings,
  GeneralSettings,
  ParametersSettings,
  ModulesSettings,
  MailSettings,
  SecuritySettings,
  AuditLogEntry,
} from "./types";

const STORAGE_KEY = "gmw_system_settings_v2";
const AUDIT_KEY = "gmw_audit_log";

const DEFAULT_GENERAL: GeneralSettings = {
  systemName: "Generic Music World",
  companyName: "Generic Music Studio",
  environment: "development",
  defaultLanguage: "tr",
  timezone: "Europe/Istanbul",
  version: "1.0.0",
};

const DEFAULT_PARAMETERS: ParametersSettings = {
  currency: "TRY",
  dateFormat: "DD.MM.YYYY",
  timeFormat: "24h",
  sessionTimeoutMinutes: 60,
  maxUploadSizeMB: 50,
};

const DEFAULT_MODULES: ModulesSettings = {
  gmwPulseEnabled: true,
  logsEnabled: true,
  dataMigrationEnabled: false,
  notificationsEnabled: true,
};

const DEFAULT_MAIL: MailSettings = {
  smtpHost: "",
  smtpPort: 587,
  senderEmail: "",
  useSSL: true,
  username: "",
  password: "",
  testEmailTo: "",
};

const DEFAULT_SECURITY: SecuritySettings = {
  enforce2FA: false,
  minPasswordLength: 8,
  passwordExpiryDays: 0,
  ipWhitelistEnabled: false,
  ipWhitelist: [],
};

export const DEFAULT_SETTINGS: SystemSettings = {
  general: DEFAULT_GENERAL,
  parameters: DEFAULT_PARAMETERS,
  modules: DEFAULT_MODULES,
  mail: DEFAULT_MAIL,
  security: DEFAULT_SECURITY,
};

function merge<T extends object>(defaults: T, partial: Partial<T> | undefined): T {
  if (!partial || typeof partial !== "object") return defaults;
  return { ...defaults, ...partial };
}

export function loadSettings(): SystemSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<SystemSettings>;
    return {
      general: merge(DEFAULT_GENERAL, parsed.general),
      parameters: merge(DEFAULT_PARAMETERS, parsed.parameters),
      modules: merge(DEFAULT_MODULES, parsed.modules),
      mail: merge(DEFAULT_MAIL, parsed.mail),
      security: merge(DEFAULT_SECURITY, parsed.security),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: SystemSettings): void {
  if (typeof window === "undefined") return;
  try {
    if (settings && typeof settings === "object") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  } catch {
    // Safari private mode / quota exceeded
  }
}

export function appendAuditLog(entry: Omit<AuditLogEntry, "id">): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    const logs: AuditLogEntry[] = raw ? JSON.parse(raw) : [];
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    };
    logs.unshift(newEntry);
    if (logs.length > 500) logs.pop();
    localStorage.setItem(AUDIT_KEY, JSON.stringify(logs));
  } catch {
    // ignore
  }
}

export function getChangedFields(
  prev: SystemSettings,
  next: SystemSettings
): string[] {
  const keys: (keyof SystemSettings)[] = [
    "general",
    "parameters",
    "modules",
    "mail",
    "security",
  ];
  const changed: string[] = [];
  for (const key of keys) {
    if (JSON.stringify(prev[key]) !== JSON.stringify(next[key])) {
      changed.push(key);
    }
  }
  return changed;
}
