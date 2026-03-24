"use client";

/** Visible only to Super Admin (role_level 0). */
export default function SystemInfoSection() {
  const logsCount = 1247;
  const systemAlerts = 0;

  return (
    <section className="ui-glass rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 backdrop-blur-sm">
      <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">
        Sistem Bilgisi (Super Admin)
      </h2>
      <div className="flex flex-wrap gap-4">
        <div className="rounded-lg border border-[var(--color-border)]/50 bg-[var(--color-bg)]/30 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wider ui-text-muted">
            Log Kayıtları
          </p>
          <p className="mt-1 text-lg font-semibold text-[var(--color-text)]">
            {logsCount}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)]/50 bg-[var(--color-bg)]/30 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wider ui-text-muted">
            Sistem Uyarıları
          </p>
          <p className="mt-1 text-lg font-semibold text-[var(--color-text)]">
            {systemAlerts}
          </p>
        </div>
      </div>
    </section>
  );
}
