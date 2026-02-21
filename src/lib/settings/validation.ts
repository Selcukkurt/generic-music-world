import type { SystemSettings, MailSettings, SecuritySettings } from "./types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(s: string): boolean {
  return EMAIL_REGEX.test(s.trim());
}

const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IPV6_REGEX = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$/;

function isValidIP(ip: string): boolean {
  const t = ip.trim();
  return IPV4_REGEX.test(t) || IPV6_REGEX.test(t);
}

export type ValidationResult = { valid: boolean; errors: Record<string, string> };

export function validateSettings(settings: SystemSettings): ValidationResult {
  const errors: Record<string, string> = {};

  if (!settings.general.systemName?.trim()) {
    errors["general.systemName"] = "Sistem adı zorunludur.";
  }
  if (!settings.general.companyName?.trim()) {
    errors["general.companyName"] = "Şirket adı zorunludur.";
  }
  if (!settings.general.timezone?.trim()) {
    errors["general.timezone"] = "Saat dilimi zorunludur.";
  }

  const params = settings.parameters;
  if (params.sessionTimeoutMinutes < 5 || params.sessionTimeoutMinutes > 1440) {
    errors["parameters.sessionTimeoutMinutes"] = "Oturum süresi 5–1440 dakika arasında olmalıdır.";
  }
  if (params.maxUploadSizeMB < 1 || params.maxUploadSizeMB > 500) {
    errors["parameters.maxUploadSizeMB"] = "Yükleme boyutu 1–500 MB arasında olmalıdır.";
  }

  const mail = settings.mail;
  if (mail.senderEmail && !isValidEmail(mail.senderEmail)) {
    errors["mail.senderEmail"] = "Geçerli bir e-posta adresi girin.";
  }
  if (mail.testEmailTo && !isValidEmail(mail.testEmailTo)) {
    errors["mail.testEmailTo"] = "Geçerli bir e-posta adresi girin.";
  }
  if (mail.smtpPort < 1 || mail.smtpPort > 65535) {
    errors["mail.smtpPort"] = "Port 1–65535 arasında olmalıdır.";
  }

  const sec = settings.security;
  if (sec.minPasswordLength < 8 || sec.minPasswordLength > 64) {
    errors["security.minPasswordLength"] = "Şifre uzunluğu 8–64 arasında olmalıdır.";
  }
  if (sec.passwordExpiryDays < 0) {
    errors["security.passwordExpiryDays"] = "Süre 0 veya pozitif olmalıdır.";
  }
  if (sec.ipWhitelistEnabled && sec.ipWhitelist.length > 0) {
    const invalid = sec.ipWhitelist.filter((ip) => !isValidIP(ip));
    if (invalid.length > 0) {
      errors["security.ipWhitelist"] = `Geçersiz IP adresleri: ${invalid.join(", ")}`;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
