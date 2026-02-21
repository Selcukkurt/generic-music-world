"use client";

import Checkbox from "@/components/ui/Checkbox";
import { useSettings } from "@/lib/settings/SettingsContext";

export default function ModullerTab() {
  const { settings, setModules } = useSettings();
  const m = settings.modules;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/50 p-4">
        <div>
          <p className="font-medium text-[var(--color-text)]">GMW Pulse</p>
          <p className="text-xs ui-text-muted">GMW Pulse modülünü etkinleştirir.</p>
        </div>
        <Checkbox
          checked={m.gmwPulseEnabled}
          onChange={(e) => setModules({ gmwPulseEnabled: e.target.checked })}
        />
      </div>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/50 p-4">
        <div>
          <p className="font-medium text-[var(--color-text)]">Log Kayıtları</p>
          <p className="text-xs ui-text-muted">Sistem loglarını kaydeder.</p>
        </div>
        <Checkbox
          checked={m.logsEnabled}
          onChange={(e) => setModules({ logsEnabled: e.target.checked })}
        />
      </div>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/50 p-4">
        <div>
          <p className="font-medium text-[var(--color-text)]">Veri Taşıma</p>
          <p className="text-xs ui-text-muted">Veri taşıma modülünü etkinleştirir.</p>
        </div>
        <Checkbox
          checked={m.dataMigrationEnabled}
          onChange={(e) => setModules({ dataMigrationEnabled: e.target.checked })}
        />
      </div>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/50 p-4">
        <div>
          <p className="font-medium text-[var(--color-text)]">Bildirimler</p>
          <p className="text-xs ui-text-muted">E-posta ve sistem bildirimlerini etkinleştirir.</p>
        </div>
        <Checkbox
          checked={m.notificationsEnabled}
          onChange={(e) => setModules({ notificationsEnabled: e.target.checked })}
        />
      </div>
    </div>
  );
}
