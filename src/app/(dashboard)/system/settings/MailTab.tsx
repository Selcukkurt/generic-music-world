"use client";

import { useState } from "react";
import Checkbox from "@/components/ui/Checkbox";
import { useSettings } from "@/lib/settings/SettingsContext";
import { useToast } from "@/components/ui/ToastProvider";

export default function MailTab() {
  const { settings, setMail } = useSettings();
  const toast = useToast();
  const m = settings.mail;
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState(m.testEmailTo);

  const handleTestMail = () => {
    if (!testEmailTo.trim()) {
      toast.error("E-posta gerekli", "Test e-postası göndermek için adres girin.");
      return;
    }
    // Placeholder: actual SMTP test would call an API
    toast.info("Test e-postası", "SMTP testi henüz yapılandırılmadı. E-posta gönderilmedi.");
    setShowTestModal(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
          SMTP Sunucusu
        </label>
        <input
          type="text"
          value={m.smtpHost}
          onChange={(e) => setMail({ smtpHost: e.target.value })}
          placeholder="smtp.example.com"
          className="ui-input"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
          SMTP Port
        </label>
        <input
          type="number"
          min={1}
          max={65535}
          value={m.smtpPort}
          onChange={(e) =>
            setMail({ smtpPort: Math.min(65535, Math.max(1, Number(e.target.value) || 587)) })
          }
          className="ui-input"
          data-field="mail.smtpPort"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
          Gönderen E-posta
        </label>
        <input
          type="email"
          value={m.senderEmail}
          onChange={(e) => setMail({ senderEmail: e.target.value })}
          placeholder="noreply@example.com"
          className="ui-input"
          data-field="mail.senderEmail"
        />
      </div>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/50 p-4">
        <div>
          <p className="font-medium text-[var(--color-text)]">SSL Kullan</p>
          <p className="text-xs ui-text-muted">Bağlantıda SSL/TLS kullan.</p>
        </div>
        <Checkbox
          checked={m.useSSL}
          onChange={(e) => setMail({ useSSL: e.target.checked })}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
          Kullanıcı Adı (isteğe bağlı)
        </label>
        <input
          type="text"
          value={m.username}
          onChange={(e) => setMail({ username: e.target.value })}
          placeholder="SMTP kullanıcı adı"
          className="ui-input"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
          Şifre (isteğe bağlı)
        </label>
        <input
          type="password"
          value={m.password}
          onChange={(e) => setMail({ password: e.target.value })}
          placeholder="••••••••"
          className="ui-input"
          autoComplete="new-password"
        />
        <p className="mt-1 text-xs ui-text-muted">Boş bırakılırsa mevcut şifre korunur.</p>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
          Test E-postası Alıcısı
        </label>
        <input
          type="email"
          value={m.testEmailTo}
          onChange={(e) => setMail({ testEmailTo: e.target.value })}
          placeholder="test@example.com"
          className="ui-input"
          data-field="mail.testEmailTo"
        />
      </div>
      <div>
        <button
          type="button"
          onClick={() => {
            setTestEmailTo(m.testEmailTo);
            setShowTestModal(true);
          }}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2.5 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
        >
          Test Mail Gönder
        </button>
      </div>

      {showTestModal && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowTestModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-[var(--color-text)]">
              Test Mail Gönder
            </h2>
            <p className="mt-1 text-sm ui-text-muted">
              Test e-postası göndermek için alıcı adresini girin.
            </p>
            <input
              type="email"
              value={testEmailTo}
              onChange={(e) => setTestEmailTo(e.target.value)}
              placeholder="test@example.com"
              className="ui-input mt-4"
            />
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2.5 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleTestMail}
                className="ui-button-primary flex-1 px-4 py-2.5 text-sm font-semibold"
              >
                Gönder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
