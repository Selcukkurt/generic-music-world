"use client";

import LanguageSwitch from "@/components/ui/LanguageSwitch";

export default function GenelTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Dil</h3>
        <p className="mt-1 text-xs ui-text-muted">Uygulama dilini seçin. Tercih kaydedilir.</p>
        <div className="mt-3">
          <LanguageSwitch />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Tema</h3>
        <p className="mt-1 text-xs ui-text-muted">Açık / koyu tema seçimi. Yakında.</p>
        <div className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 px-4 py-3 text-sm ui-text-muted">
          Tema ayarları yakında eklenecek.
        </div>
      </div>
    </div>
  );
}
