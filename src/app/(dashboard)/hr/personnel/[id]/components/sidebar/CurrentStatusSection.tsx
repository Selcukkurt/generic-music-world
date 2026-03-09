"use client";

import type { CurrentStatusData } from "../../config/sidebar";

type CurrentStatusSectionProps = {
  data: CurrentStatusData;
};

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
      <span className="text-xs font-medium ui-text-muted">{label}</span>
      <span className="text-sm font-medium text-[var(--color-text)]">{value}</span>
    </div>
  );
}

export default function CurrentStatusSection({ data }: CurrentStatusSectionProps) {
  return (
    <div className="divide-y divide-[var(--color-border)]">
      <Row label="Durum" value={data.durum} />
      <Row label="Sistem Hesabı" value={data.sistemHesabi} />
      <Row label="Onay Bekleyen" value={data.onayBekleyen} />
      <Row label="Açık Görev" value={data.acikGorev} />
    </div>
  );
}
