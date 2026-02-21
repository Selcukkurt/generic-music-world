"use client";

import { useSettings } from "@/lib/settings/SettingsContext";

export default function GenelTab() {
  const { settings, setGeneral } = useSettings();
  const g = settings.general;

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
          Sistem Adı
        </label>
        <input
          type="text"
          value={g.systemName}
          onChange={(e) => setGeneral({ systemName: e.target.value })}
          placeholder="Generic Music World"
          className="ui-input"
          data-field="general.systemName"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
          Şirket Adı
        </label>
        <input
          type="text"
          value={g.companyName}
          onChange={(e) => setGeneral({ companyName: e.target.value })}
          placeholder="Generic Music Studio"
          className="ui-input"
          data-field="general.companyName"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
          Ortam
        </label>
        <input
          type="text"
          value={g.environment}
          readOnly
          className="ui-input cursor-not-allowed opacity-70"
          title="Salt okunur"
        />
        <p className="mt-1 text-xs ui-text-muted">Ortam değiştirilemez.</p>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
          Varsayılan Dil
        </label>
        <select
          value={g.defaultLanguage}
          onChange={(e) =>
            setGeneral({ defaultLanguage: e.target.value as "tr" | "en" })
          }
          className="ui-input"
        >
          <option value="tr">Türkçe</option>
          <option value="en">English</option>
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
          Saat Dilimi
        </label>
        <input
          type="text"
          value={g.timezone}
          onChange={(e) => setGeneral({ timezone: e.target.value })}
          placeholder="Europe/Istanbul"
          className="ui-input"
          data-field="general.timezone"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
          Sürüm
        </label>
        <input
          type="text"
          value={g.version}
          readOnly
          className="ui-input cursor-not-allowed opacity-70"
          title="Salt okunur"
        />
      </div>
    </div>
  );
}
