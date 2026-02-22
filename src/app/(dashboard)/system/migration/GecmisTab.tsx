"use client";

import { useState } from "react";

const MOCK_JOBS = [
  { id: "JOB-001", type: "İçe Aktar", dataset: "Etkinlikler", started: "2026-02-21 14:30", status: "Başarılı" },
  { id: "JOB-002", type: "Dışa Aktar", dataset: "Sanatçılar", started: "2026-02-21 13:15", status: "Başarılı" },
  { id: "JOB-003", type: "İçe Aktar", dataset: "Biletler", started: "2026-02-21 12:00", status: "Hatalı" },
  { id: "JOB-004", type: "İçe Aktar", dataset: "Kullanıcılar", started: "2026-02-21 11:45", status: "Devam Ediyor" },
] as const;

export default function GecmisTab() {
  const [detailJob, setDetailJob] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    if (status === "Başarılı")
      return "bg-emerald-500/20 text-emerald-200";
    if (status === "Hatalı") return "bg-red-500/20 text-red-200";
    return "bg-amber-500/20 text-amber-200";
  };

  return (
    <div className="space-y-6">
      <p className="text-sm ui-text-muted">
        Geçmiş içe/dışa aktarma işlemleri. V1: statik gösterim.
      </p>
      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Job ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Tip
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Veri Seti
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Başlangıç
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                Durum
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                İşlem
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {MOCK_JOBS.map((j) => (
              <tr
                key={j.id}
                className="transition hover:bg-[var(--color-surface-hover)]/50"
              >
                <td className="px-4 py-3.5 text-sm font-medium text-[var(--color-text)] sm:px-6">
                  {j.id}
                </td>
                <td className="px-4 py-3.5 text-sm ui-text-secondary sm:px-6">
                  {j.type}
                </td>
                <td className="px-4 py-3.5 text-sm ui-text-secondary sm:px-6">
                  {j.dataset}
                </td>
                <td className="px-4 py-3.5 text-xs ui-text-muted sm:px-6">
                  {j.started}
                </td>
                <td className="px-4 py-3.5 sm:px-6">
                  <span
                    className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${getStatusBadge(j.status)}`}
                  >
                    {j.status}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right sm:px-6">
                  <button
                    type="button"
                    onClick={() => setDetailJob(j.id)}
                    className="text-sm font-medium text-[var(--brand-yellow)] hover:underline"
                  >
                    Detay
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detailJob && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setDetailJob(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-[var(--color-text)]">
              İş Detayı
            </h2>
            <p className="mt-2 text-sm ui-text-muted">
              Job ID: {detailJob}
            </p>
            <p className="mt-1 text-sm ui-text-muted">
              V1: Detay modalı statik içerik gösterir.
            </p>
            <button
              type="button"
              onClick={() => setDetailJob(null)}
              className="mt-4 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2.5 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
