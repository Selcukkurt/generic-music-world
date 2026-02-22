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

const FORMATS = [
  { id: "csv", label: "CSV" },
  { id: "xlsx", label: "XLSX" },
  { id: "json", label: "JSON" },
] as const;

export default function DisaAktarTab() {
  const toast = useToast();
  const [dataset, setDataset] = useState("");
  const [format, setFormat] = useState("csv");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const handleExport = () => {
    toast.info("Yakında", "Dışa aktarma yakında aktif olacak.");
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
          Tarih Aralığı (İsteğe bağlı)
        </h3>
        <div className="mt-3 flex flex-wrap gap-4">
          <div>
            <label className="mb-1 block text-xs ui-text-muted">Başlangıç</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="ui-input"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs ui-text-muted">Bitiş</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="ui-input"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/50 p-4">
        <h3 className="text-sm font-medium text-[var(--color-text)]">
          Format
        </h3>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          className="ui-input mt-2 max-w-xs"
        >
          {FORMATS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={handleExport}
        className="ui-button-primary rounded-lg px-4 py-2.5 text-sm font-semibold"
      >
        Dışa Aktar
      </button>
    </div>
  );
}
