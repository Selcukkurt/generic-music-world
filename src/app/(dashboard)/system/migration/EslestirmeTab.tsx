"use client";

import { useToast } from "@/components/ui/ToastProvider";

const MOCK_MAPPINGS = [
  { source: "event_name", target: "etkinlik_adi" },
  { source: "artist_name", target: "sanatci_adi" },
  { source: "venue", target: "mekan" },
  { source: "date", target: "tarih" },
] as const;

export default function EslestirmeTab() {
  const toast = useToast();

  const handleAutoMatch = () => {
    toast.info("Yakında", "Otomatik eşleştirme yakında aktif olacak.");
  };

  return (
    <div className="space-y-6">
      <p className="text-sm ui-text-muted">
        Kaynak sütunları hedef alanlara eşleyin. V1: statik gösterim.
      </p>
      <div className="rounded-lg border border-[var(--color-border)]">
        <table className="w-full min-w-[400px]">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Kaynak Sütun
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                →
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Hedef Alan
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {MOCK_MAPPINGS.map((m, i) => (
              <tr
                key={i}
                className="transition hover:bg-[var(--color-surface-hover)]/50"
              >
                <td className="px-4 py-3.5 text-sm font-medium text-[var(--color-text)] sm:px-6">
                  {m.source}
                </td>
                <td className="px-4 py-3.5 text-sm ui-text-muted sm:px-6">→</td>
                <td className="px-4 py-3.5 text-sm ui-text-secondary sm:px-6">
                  {m.target}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={handleAutoMatch}
        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2.5 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
      >
        Otomatik Eşleştir
      </button>
    </div>
  );
}
