"use client";

import { useToast } from "@/components/ui/ToastProvider";

export default function OturumGirisTab() {
  const toast = useToast();

  const handleForceRelogin = () => {
    toast.info("Yakında", "Zorunlu yeniden giriş özelliği yakında aktif olacak.");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/50 p-4">
        <h3 className="text-sm font-medium text-[var(--color-text)]">
          Oturum Zaman Aşımı
        </h3>
        <p className="mt-1 text-xs ui-text-muted">
          Oturum süresi ayarları Sistem Ayarları → Parametreler bölümünden yapılandırılır.
        </p>
        <span className="mt-2 inline-flex rounded px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-200">
          Yakında
        </span>
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/50 p-4">
        <h3 className="text-sm font-medium text-[var(--color-text)]">
          Zorunlu Yeniden Giriş
        </h3>
        <p className="mt-1 text-xs ui-text-muted">
          Tüm kullanıcıları çıkışa zorla ve yeniden giriş yapmalarını iste.
        </p>
        <button
          type="button"
          onClick={handleForceRelogin}
          className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2.5 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
        >
          Zorunlu Yeniden Giriş
        </button>
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/50 p-4">
        <h3 className="text-sm font-medium text-[var(--color-text)]">
          İki Faktörlü Doğrulama (2FA)
        </h3>
        <p className="mt-1 text-xs ui-text-muted">
          TOTP tabanlı 2FA desteği.
        </p>
        <span className="mt-2 inline-flex rounded px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-200">
          Yakında
        </span>
      </div>
    </div>
  );
}
