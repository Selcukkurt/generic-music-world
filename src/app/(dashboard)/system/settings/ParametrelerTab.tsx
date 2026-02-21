"use client";

import { useSettings } from "@/lib/settings/SettingsContext";

export default function ParametrelerTab() {
  const { settings, setParameters } = useSettings();
  const p = settings.parameters;

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
          Para Birimi
        </label>
        <select
          value={p.currency}
          onChange={(e) =>
            setParameters({ currency: e.target.value as "TRY" | "USD" | "EUR" })
          }
          className="ui-input"
        >
          <option value="TRY">TRY</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
          Tarih Formatı
        </label>
        <select
          value={p.dateFormat}
          onChange={(e) =>
            setParameters({
              dateFormat: e.target.value as "DD.MM.YYYY" | "YYYY-MM-DD",
            })
          }
          className="ui-input"
        >
          <option value="DD.MM.YYYY">DD.MM.YYYY</option>
          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
          Saat Formatı
        </label>
        <select
          value={p.timeFormat}
          onChange={(e) =>
            setParameters({
              timeFormat: e.target.value as "24h" | "12h",
            })
          }
          className="ui-input"
        >
          <option value="24h">24 saat</option>
          <option value="12h">12 saat</option>
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
          Oturum Süresi (dakika)
        </label>
        <input
          type="number"
          min={5}
          max={1440}
          value={p.sessionTimeoutMinutes}
          onChange={(e) =>
            setParameters({
              sessionTimeoutMinutes: Math.min(
                1440,
                Math.max(5, Number(e.target.value) || 5)
              ),
            })
          }
          className="ui-input"
          data-field="parameters.sessionTimeoutMinutes"
        />
        <p className="mt-1 text-xs ui-text-muted">5–1440 dakika arası.</p>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
          Maks. Yükleme Boyutu (MB)
        </label>
        <input
          type="number"
          min={1}
          max={500}
          value={p.maxUploadSizeMB}
          onChange={(e) =>
            setParameters({
              maxUploadSizeMB: Math.min(
                500,
                Math.max(1, Number(e.target.value) || 1)
              ),
            })
          }
          className="ui-input"
          data-field="parameters.maxUploadSizeMB"
        />
        <p className="mt-1 text-xs ui-text-muted">1–500 MB arası.</p>
      </div>
    </div>
  );
}
