"use client";

import { useToast } from "@/components/ui/ToastProvider";

const VALIDATION_RULES = [
  { id: "required", label: "Zorunlu alanlar", desc: "Boş değer kabul edilmez" },
  { id: "type", label: "Tip kontrolü", desc: "Tarih, sayı, metin formatları" },
  { id: "duplicates", label: "Tekrar kontrolü", desc: "Benzersiz kayıtlar" },
] as const;

export default function DogrulamaTab() {
  const toast = useToast();

  const handleDownloadReport = () => {
    toast.info("Yakında", "Hata raporu indirme yakında aktif olacak.");
  };

  return (
    <div className="space-y-6">
      <p className="text-sm ui-text-muted">
        Doğrulama kuralları ve sonuç özeti. V1: statik gösterim.
      </p>

      <div>
        <h3 className="text-sm font-medium text-[var(--color-text)]">
          Doğrulama Kuralları
        </h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VALIDATION_RULES.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/50 p-4"
            >
              <p className="font-medium text-[var(--color-text)]">{r.label}</p>
              <p className="mt-1 text-xs ui-text-muted">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/50 p-4">
        <h3 className="text-sm font-medium text-[var(--color-text)]">
          Sonuç Özeti
        </h3>
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-200">
              Hatalar: 0
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-200">
              Uyarılar: 0
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-200">
              Geçti: 0
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDownloadReport}
        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2.5 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        disabled
      >
        Hata raporu indir
      </button>
    </div>
  );
}
