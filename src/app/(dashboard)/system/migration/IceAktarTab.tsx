"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";

const DATASETS = [
  { id: "etkinlikler", label: "Etkinlikler" },
  { id: "sanatcilar", label: "Sanatçılar" },
  { id: "mekanlar", label: "Mekanlar" },
  { id: "biletler", label: "Biletler" },
  { id: "kullanicilar", label: "Kullanıcılar" },
] as const;

const MOCK_PREVIEW = [
  { col1: "Örnek 1", col2: "Değer A", col3: "2026-01-15" },
  { col1: "Örnek 2", col2: "Değer B", col3: "2026-01-16" },
  { col1: "Örnek 3", col2: "Değer C", col3: "2026-01-17" },
  { col1: "Örnek 4", col2: "Değer D", col3: "2026-01-18" },
  { col1: "Örnek 5", col2: "Değer E", col3: "2026-01-19" },
];

export default function IceAktarTab() {
  const toast = useToast();
  const [dataset, setDataset] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = () => {
    toast.info("Yakında", "Dosya seçimi yakında aktif olacak.");
  };

  const handleStartImport = () => {
    toast.info("Yakında", "İçe aktarma yakında aktif olacak.");
  };

  const handlePreview = () => {
    setShowPreview(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    toast.info("Yakında", "Dosya yükleme yakında aktif olacak.");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/50 p-4">
        <h3 className="text-sm font-medium text-[var(--color-text)]">
          Veri Seti
        </h3>
        <select
          value={dataset}
          onChange={(e) => setDataset(e.target.value)}
          className="ui-input mt-2 max-w-xs"
        >
          <option value="">Seçin</option>
          {DATASETS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/50 p-4">
        <h3 className="text-sm font-medium text-[var(--color-text)]">
          Dosya Yükle (CSV / XLSX)
        </h3>
        <p className="mt-1 text-xs ui-text-muted">
          Dosyayı sürükleyip bırakın veya dosya seçin.
        </p>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`mt-3 flex min-h-[120px] flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition ${
            isDragging
              ? "border-[var(--brand-yellow)] bg-[var(--brand-yellow)]/5"
              : "border-[var(--color-border)]"
          }`}
        >
          <p className="text-sm ui-text-muted">
            CSV veya XLSX dosyası buraya sürükleyin
          </p>
          <button
            type="button"
            onClick={handleFileSelect}
            className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
          >
            Dosya Seç
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/50 p-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-medium text-[var(--color-text)]">
            Önizleme
          </h3>
          <button
            type="button"
            onClick={handlePreview}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-3 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
          >
            Önizleme
          </button>
        </div>
        {showPreview && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--color-border)]">
            <table className="w-full min-w-[320px]">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/50">
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase ui-text-muted">
                    Sütun 1
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase ui-text-muted">
                    Sütun 2
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase ui-text-muted">
                    Sütun 3
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {MOCK_PREVIEW.map((row, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-sm ui-text-secondary">
                      {row.col1}
                    </td>
                    <td className="px-4 py-2 text-sm ui-text-secondary">
                      {row.col2}
                    </td>
                    <td className="px-4 py-2 text-sm ui-text-secondary">
                      {row.col3}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleStartImport}
        className="ui-button-primary rounded-lg px-4 py-2.5 text-sm font-semibold"
      >
        İçe Aktarmayı Başlat
      </button>
    </div>
  );
}
