"use client";

export default function GuvenlikTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Oturum bilgisi</h3>
        <p className="mt-1 text-xs ui-text-muted">Aktif oturumunuz ve güvenlik ayarları.</p>
        <div className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 p-4">
          <p className="text-sm ui-text-muted">Oturum detayları yakında gösterilecek.</p>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Şifre değiştir</h3>
        <p className="mt-1 text-xs ui-text-muted">Hesap şifrenizi güncelleyin.</p>
        <button
          type="button"
          disabled
          className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 px-4 py-2 text-sm font-medium ui-text-muted"
        >
          Şifremi sıfırla (yakında)
        </button>
      </div>
    </div>
  );
}
