"use client";

/**
 * Post-compliance waiting state: personnel assignment & work agreement not done yet.
 */
export default function HubPendingPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-12 sm:py-16">
      <div className="ui-glass w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 p-8 text-center shadow-[var(--shadow-medium)] sm:p-10">
        <div className="mx-auto mb-6 h-1.5 w-14 rounded-full bg-[var(--brand-yellow)]" />
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--brand-yellow)]/35 bg-[var(--brand-yellow)]/10 text-[var(--brand-yellow)]">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--brand-yellow)]">
          Kurumsal süreç
        </p>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-[var(--color-text)] sm:text-2xl">
          Personel ataması bekleniyor
        </h1>
        <p className="mt-5 text-sm leading-relaxed text-[var(--color-text-muted)]">
          İstihdam öncesi kurumsal onaylarınız tamamlandı. Personel kaydı, görev ve sorumlulukların tanımı,
          çalışma modeli ve iş / çalışma sözleşmesinin İK veya yöneticiniz tarafından tamamlanması
          gerekiyor. Bu kurulum bittiğinde tam Hub erişiminiz otomatik olarak açılacaktır.
        </p>
        <div className="mt-8 rounded-xl border border-[var(--color-border)]/80 bg-[var(--color-bg)]/40 px-4 py-3 text-left text-xs leading-relaxed text-[var(--color-text-secondary)]">
          Bu ekran bilgilendirme amaçlıdır; Hub erişimi verilene kadar görüntülenmeye devam edebilir.
          Ek işlem yapmanız gerekmez.
        </div>
      </div>
    </div>
  );
}
