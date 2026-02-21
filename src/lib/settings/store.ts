import type {
  SystemSettings,
  GeneralSettings,
  NotificationSettings,
  IntegrationSettings,
  AppearanceSettings,
} from "./types";

const STORAGE_KEY = "gmw_system_settings_v1";

const DEFAULT_GENERAL: GeneralSettings = {
  organizationName: "Generic Music World",
  workspaceCode: "GMW",
  defaultLocale: "tr",
  timezone: "Europe/Istanbul",
  currency: "TRY",
  logoMetadata: "",
};

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  emailNotifications: true,
  criticalAlerts: true,
  weeklySummary: false,
  notificationRecipients: "info@genericmusic.net",
};

const DEFAULT_INTEGRATIONS: IntegrationSettings = {
  publicApiKey: "gmw_pk_live_xxxxxxxxxxxxxxxxxxxxxxxx",
  webhookUrl: "",
};

const DEFAULT_APPEARANCE: AppearanceSettings = {
  theme: "dark",
  dashboardDensity: "comfortable",
  sidebarCollapsedByDefault: false,
  reducedMotion: false,
};

export const DEFAULT_SETTINGS: SystemSettings = {
  general: DEFAULT_GENERAL,
  notifications: DEFAULT_NOTIFICATIONS,
  integrations: DEFAULT_INTEGRATIONS,
  appearance: DEFAULT_APPEARANCE,
};

export function loadSettings(): SystemSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<SystemSettings>;
    return {
      general: { ...DEFAULT_GENERAL, ...(parsed.general ?? {}) },
      notifications: { ...DEFAULT_NOTIFICATIONS, ...(parsed.notifications ?? {}) },
      integrations: { ...DEFAULT_INTEGRATIONS, ...(parsed.integrations ?? {}) },
      appearance: { ...DEFAULT_APPEARANCE, ...(parsed.appearance ?? {}) },
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
    // Safari private mode / quota exceeded – ignore
  }
}
