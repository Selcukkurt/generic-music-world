"use client";

/**
 * Post-compliance waiting state: personnel assignment & work agreement not done yet.
 * Phase 2+ will sync copy with i18n and live status from API.
 */
export default function HubPendingPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface2)] text-[var(--color-text-muted)]">
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h1 className="text-xl font-semibold tracking-tight text-[var(--color-text)]">Ön onay tamamlandı</h1>
      <p className="mt-4 text-sm leading-relaxed text-[var(--color-text-muted)]">
        Ön onay süreciniz tamamlandı. Personel ataması ve çalışma sözleşmesi / iş sözleşmesi kurulumu
        beklemede. İnsan kaynakları veya yöneticiniz atamayı tamamladığında tam erişim açılacaktır.
      </p>
      <p className="mt-6 text-xs text-[var(--color-text-muted)]">
        Bu ekran, Hub erişimi verilene kadar görüntülenmeye devam edebilir.
      </p>
    </div>
  );
}
