export type Locale = "tr" | "en";
export type Currency = "TRY" | "USD" | "EUR";
export type DateFormat = "DD.MM.YYYY" | "YYYY-MM-DD";
export type TimeFormat = "24h" | "12h";
export type Environment = "development" | "staging" | "production";

export type GeneralSettings = {
  systemName: string;
  companyName: string;
  environment: Environment;
  defaultLanguage: Locale;
  timezone: string;
  version: string;
};

export type ParametersSettings = {
  currency: Currency;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  sessionTimeoutMinutes: number;
  maxUploadSizeMB: number;
};

export type ModulesSettings = {
  gmwPulseEnabled: boolean;
  logsEnabled: boolean;
  dataMigrationEnabled: boolean;
  notificationsEnabled: boolean;
};

export type MailSettings = {
  smtpHost: string;
  smtpPort: number;
  senderEmail: string;
  useSSL: boolean;
  username: string;
  password: string;
  testEmailTo: string;
};

export type SecuritySettings = {
  enforce2FA: boolean;
  minPasswordLength: number;
  passwordExpiryDays: number;
  ipWhitelistEnabled: boolean;
  ipWhitelist: string[];
};

export type SystemSettings = {
  general: GeneralSettings;
  parameters: ParametersSettings;
  modules: ModulesSettings;
  mail: MailSettings;
  security: SecuritySettings;
};

export type AuditLogEntry = {
  id: string;
  actorUserId: string;
  actorRole: string;
  action: string;
  changedFields: string[];
  timestamp: string;
};
