"use client";

export default function BildirimAyarlariTab() {
  return (
    <div className="space-y-6">
      <p className="text-sm ui-text-muted">
        E-posta ve uygulama içi bildirim kategorileri. Yakında yapılandırılabilecek.
      </p>
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-4 py-3">
            <span className="text-sm font-medium text-[var(--color-text)]">E-posta bildirimleri</span>
            <span className="text-xs ui-text-muted">Yakında</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-4 py-3">
            <span className="text-sm font-medium text-[var(--color-text)]">Uygulama içi bildirimler</span>
            <span className="text-xs ui-text-muted">Yakında</span>
          </div>
        </div>
      </div>
    </div>
  );
}
