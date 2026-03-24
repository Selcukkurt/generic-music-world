"use client";

/** Super Admin only. Mock system status. */
export default function SystemStatusCard() {
  const errorCount = 2;
  const activeUsers = 12;
  const lastLoginAttempts = 47;

  return (
    <section className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-5 backdrop-blur-sm">
      <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">
        Sistem Durumu
      </h2>
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)]/50 bg-[var(--color-bg)]/30 px-3 py-2">
          <span className="text-xs font-medium uppercase tracking-wider ui-text-muted">Hata sayısı</span>
          <span className="font-semibold text-red-400">{errorCount}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)]/50 bg-[var(--color-bg)]/30 px-3 py-2">
          <span className="text-xs font-medium uppercase tracking-wider ui-text-muted">Aktif kullanıcı</span>
          <span className="font-semibold text-[var(--color-text)]">{activeUsers}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)]/50 bg-[var(--color-bg)]/30 px-3 py-2">
          <span className="text-xs font-medium uppercase tracking-wider ui-text-muted">Son giriş denemeleri</span>
          <span className="font-semibold text-[var(--color-text)]">{lastLoginAttempts}</span>
        </div>
      </div>
    </section>
  );
}
