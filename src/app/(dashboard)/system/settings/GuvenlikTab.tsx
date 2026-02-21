"use client";

import Checkbox from "@/components/ui/Checkbox";
import { useSettings } from "@/lib/settings/SettingsContext";

export default function GuvenlikTab() {
  const { settings, setSecurity } = useSettings();
  const s = settings.security;

  const ipWhitelistStr = s.ipWhitelist.join(", ");
  const handleIpWhitelistChange = (value: string) => {
    const list = value
      .split(/[,\s]+/)
      .map((ip) => ip.trim())
      .filter(Boolean);
    setSecurity({ ipWhitelist: list });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/50 p-4">
        <div>
          <p className="font-medium text-[var(--color-text)]">2FA Zorunlu</p>
          <p className="text-xs ui-text-muted">Tüm kullanıcılar için iki faktörlü doğrulama zorunlu.</p>
        </div>
        <Checkbox
          checked={s.enforce2FA}
          onChange={(e) => setSecurity({ enforce2FA: e.target.checked })}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
          Min. Şifre Uzunluğu
        </label>
        <input
          type="number"
          min={8}
          max={64}
          value={s.minPasswordLength}
          onChange={(e) =>
            setSecurity({
              minPasswordLength: Math.min(
                64,
                Math.max(8, Number(e.target.value) || 8)
              ),
            })
          }
          className="ui-input"
          data-field="security.minPasswordLength"
        />
        <p className="mt-1 text-xs ui-text-muted">8–64 karakter arası.</p>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
          Şifre Geçerlilik Süresi (gün)
        </label>
        <input
          type="number"
          min={0}
          value={s.passwordExpiryDays}
          onChange={(e) =>
            setSecurity({
              passwordExpiryDays: Math.max(0, Number(e.target.value) || 0),
            })
          }
          className="ui-input"
          data-field="security.passwordExpiryDays"
        />
        <p className="mt-1 text-xs ui-text-muted">0 = süresiz.</p>
      </div>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/50 p-4">
        <div>
          <p className="font-medium text-[var(--color-text)]">IP Beyaz Listesi</p>
          <p className="text-xs ui-text-muted">Sadece belirtilen IP adreslerinden erişime izin ver.</p>
        </div>
        <Checkbox
          checked={s.ipWhitelistEnabled}
          onChange={(e) => setSecurity({ ipWhitelistEnabled: e.target.checked })}
        />
      </div>
      {s.ipWhitelistEnabled && (
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
            IP Adresleri (virgülle ayırın)
          </label>
          <input
            type="text"
            value={ipWhitelistStr}
            onChange={(e) => handleIpWhitelistChange(e.target.value)}
            placeholder="192.168.1.1, 10.0.0.1"
            className="ui-input"
            data-field="security.ipWhitelist"
          />
          <p className="mt-1 text-xs ui-text-muted">IPv4 veya IPv6 formatında.</p>
        </div>
      )}
    </div>
  );
}
