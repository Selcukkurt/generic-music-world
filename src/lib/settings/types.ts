export type Locale = "tr" | "en";
export type Currency = "TRY" | "USD" | "EUR";
export type DashboardDensity = "comfortable" | "compact";
export type Theme = "dark" | "light";

export type GeneralSettings = {
  organizationName: string;
  workspaceCode: string;
  defaultLocale: Locale;
  timezone: string;
  currency: Currency;
  logoMetadata: string;
};

export type NotificationSettings = {
  emailNotifications: boolean;
  criticalAlerts: boolean;
  weeklySummary: boolean;
  notificationRecipients: string;
};

export type IntegrationSettings = {
  publicApiKey: string;
  webhookUrl: string;
};

export type AppearanceSettings = {
  theme: Theme;
  dashboardDensity: DashboardDensity;
  sidebarCollapsedByDefault: boolean;
  reducedMotion: boolean;
};

export type SystemSettings = {
  general: GeneralSettings;
  notifications: NotificationSettings;
  integrations: IntegrationSettings;
  appearance: AppearanceSettings;
};
