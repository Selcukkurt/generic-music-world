"use client";

import SectionCard from "./SectionCard";

// ─── Data interfaces (for future real-data integration) ─────────────────────
export type CareerEventType =
  | "unvan_degisikligi"
  | "departman_transferi"
  | "modul_sorumlulugu"
  | "maas_bandi";

export interface CareerJourneyItem {
  id: string;
  tip: CareerEventType;
  baslik: string;
  kisaAciklama: string;
  tarih: string;
  onceMeta?: string;
  sonraMeta?: string;
}

export interface AuditLogItem {
  id: string;
  islemTipi: string;
  kisaAciklama: string;
  tarihSaat: string;
  yapanKisi: string;
  ipBilgisi?: string;
  cihazOturumOzeti?: string;
}

export type MilestoneType =
  | "onboarding"
  | "offboarding"
  | "vekalet_baslangic"
  | "vekalet_bitis"
  | "disiplin"
  | "odul_takdir"
  | "performans_donum";

export interface MilestoneItem {
  id: string;
  tip: MilestoneType;
  baslik: string;
  tarih: string;
  meta?: string;
}

export interface RevisionHistoryItem {
  id: string;
  belgeAdi: string;
  versiyon: string;
  tarih: string;
  durum: string;
}

export interface ActivitySummaryData {
  son30GunIslemSayisi: number;
  sonRolDegisikligi: string;
  sonSozlesmeGuncellemesi: string;
  sonPerformansDegerlendirmesi: string;
}

export interface HistoryTabData {
  activitySummary: ActivitySummaryData;
  careerJourney: CareerJourneyItem[];
  auditLog: AuditLogItem[];
  milestones: MilestoneItem[];
  revisionHistory: RevisionHistoryItem[];
}

// ─── Type labels ────────────────────────────────────────────────────────────
const CAREER_TYPE_LABELS: Record<CareerEventType, string> = {
  unvan_degisikligi: "Ünvan Değişikliği",
  departman_transferi: "Departman Transferi",
  modul_sorumlulugu: "Modül Sorumluluğu",
  maas_bandi: "Maaş Bandı",
};

const MILESTONE_TYPE_LABELS: Record<MilestoneType, string> = {
  onboarding: "Onboarding",
  offboarding: "Offboarding",
  vekalet_baslangic: "Vekalet Başlangıcı",
  vekalet_bitis: "Vekalet Bitişi",
  disiplin: "Disiplin Kaydı",
  odul_takdir: "Ödül / Takdir",
  performans_donum: "Performans Dönüm Noktası",
};

const MILESTONE_STYLES: Record<MilestoneType, string> = {
  onboarding: "bg-emerald-500/20 text-emerald-200",
  offboarding: "bg-red-500/20 text-red-200",
  vekalet_baslangic: "bg-blue-500/20 text-blue-200",
  vekalet_bitis: "bg-blue-500/10 ui-text-muted",
  disiplin: "bg-amber-500/20 text-amber-200",
  odul_takdir: "bg-emerald-500/20 text-emerald-200",
  performans_donum: "bg-[var(--color-primary)]/20 text-[var(--color-primary)]",
};

// ─── Mock data ─────────────────────────────────────────────────────────────
const MOCK_DATA: HistoryTabData = {
  activitySummary: {
    son30GunIslemSayisi: 24,
    sonRolDegisikligi: "15.01.2026 — Event Admin eklendi",
    sonSozlesmeGuncellemesi: "15.03.2024 — v2.1",
    sonPerformansDegerlendirmesi: "15.01.2026 — Q1 2025",
  },
  careerJourney: [
    {
      id: "1",
      tip: "unvan_degisikligi",
      baslik: "Senior Producer",
      kisaAciklama: "Prodüksiyon ve operasyon alanında kıdemli rol",
      tarih: "01.04.2023",
      onceMeta: "Producer",
      sonraMeta: "Senior Producer",
    },
    {
      id: "2",
      tip: "departman_transferi",
      baslik: "Prodüksiyon & Operasyonlar",
      kisaAciklama: "Etkinlik ekibinden ana prodüksiyon departmanına transfer",
      tarih: "15.06.2022",
      onceMeta: "Etkinlik Ekibi",
      sonraMeta: "Prodüksiyon & Operasyonlar",
    },
    {
      id: "3",
      tip: "modul_sorumlulugu",
      baslik: "M02 Events, M04 Personel",
      kisaAciklama: "Modül sorumluluğu genişletildi",
      tarih: "01.01.2024",
      onceMeta: "M02 Events",
      sonraMeta: "M02 Events, M04 Personel",
    },
    {
      id: "4",
      tip: "maas_bandi",
      baslik: "P3 - Senior",
      kisaAciklama: "Maaş bandı güncellemesi",
      tarih: "01.04.2023",
      onceMeta: "P2",
      sonraMeta: "P3 - Senior",
    },
  ],
  auditLog: [
    {
      id: "1",
      islemTipi: "Profil Görüntüleme",
      kisaAciklama: "360° Personel Kartı açıldı",
      tarihSaat: "08.02.2026 14:32",
      yapanKisi: "Ahmet Yılmaz",
      ipBilgisi: "192.168.1.105",
      cihazOturumOzeti: "Chrome / Masaüstü",
    },
    {
      id: "2",
      islemTipi: "RBAC Rol Güncelleme",
      kisaAciklama: "Event Admin rolü eklendi",
      tarihSaat: "15.01.2026 10:15",
      yapanKisi: "Sistem Admin",
      ipBilgisi: "10.0.0.12",
      cihazOturumOzeti: "Sistem",
    },
    {
      id: "3",
      islemTipi: "Performans Notu",
      kisaAciklama: "Q1 2025 değerlendirmesi kaydedildi",
      tarihSaat: "15.01.2026 09:45",
      yapanKisi: "Ahmet Yılmaz",
      ipBilgisi: "192.168.1.105",
      cihazOturumOzeti: "Chrome / Masaüstü",
    },
    {
      id: "4",
      islemTipi: "Sözleşme Görüntüleme",
      kisaAciklama: "İş sözleşmesi v2.1 indirildi",
      tarihSaat: "10.01.2026 16:20",
      yapanKisi: "Selçuk Kurt",
      ipBilgisi: "192.168.1.88",
      cihazOturumOzeti: "Safari / Mobil",
    },
  ],
  milestones: [
    {
      id: "1",
      tip: "onboarding",
      baslik: "İşe Başlama",
      tarih: "15.03.2019",
      meta: "GMW Academy tamamlandı",
    },
    {
      id: "2",
      tip: "odul_takdir",
      baslik: "Yılın Prodüksiyon Ödülü",
      tarih: "20.12.2024",
      meta: "Istanbul Music Summit 2024",
    },
    {
      id: "3",
      tip: "performans_donum",
      baslik: "Q1 2025 Değerlendirmesi",
      tarih: "15.01.2026",
      meta: "4.2 / 5",
    },
  ],
  revisionHistory: [
    {
      id: "1",
      belgeAdi: "İş Sözleşmesi",
      versiyon: "v2.1",
      tarih: "15.03.2024",
      durum: "Onaylı",
    },
    {
      id: "2",
      belgeAdi: "NDA Belgesi",
      versiyon: "v1.0",
      tarih: "10.02.2019",
      durum: "Onaylı",
    },
    {
      id: "3",
      belgeAdi: "Gizlilik Politikası Onayı",
      versiyon: "2024.1",
      tarih: "01.01.2024",
      durum: "Onaylı",
    },
    {
      id: "4",
      belgeAdi: "Maaş Bandı Belgesi",
      versiyon: "P3-2023",
      tarih: "01.04.2023",
      durum: "Aktif",
    },
  ],
};

// ─── Component ─────────────────────────────────────────────────────────────
type HistoryTabContentProps = {
  data?: Partial<HistoryTabData>;
};

export default function HistoryTabContent({ data: dataOverride }: HistoryTabContentProps = {}) {
  const data: HistoryTabData = {
    activitySummary: { ...MOCK_DATA.activitySummary, ...dataOverride?.activitySummary },
    careerJourney: dataOverride?.careerJourney ?? MOCK_DATA.careerJourney,
    auditLog: dataOverride?.auditLog ?? MOCK_DATA.auditLog,
    milestones: dataOverride?.milestones ?? MOCK_DATA.milestones,
    revisionHistory: dataOverride?.revisionHistory ?? MOCK_DATA.revisionHistory,
  };

  return (
    <div className="flex flex-col gap-8">
      {/* E: Aktivite Özeti — near top */}
      <SectionCard title="Aktivite Özeti">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider ui-text-muted">
              Son 30 Gün İşlem Sayısı
            </p>
            <p className="mt-1 text-xl font-bold text-[var(--color-text)]">
              {data.activitySummary.son30GunIslemSayisi}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider ui-text-muted">
              Son Rol Değişikliği
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--color-text)]">
              {data.activitySummary.sonRolDegisikligi}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider ui-text-muted">
              Son Sözleşme Güncellemesi
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--color-text)]">
              {data.activitySummary.sonSozlesmeGuncellemesi}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider ui-text-muted">
              Son Performans Değerlendirmesi
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--color-text)]">
              {data.activitySummary.sonPerformansDegerlendirmesi}
            </p>
          </div>
        </div>
      </SectionCard>

      {/* A + B: Kariyer Yolculuğu & Sistem İşlem Kayıtları — main focus */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* A: Kariyer Yolculuğu */}
        <SectionCard title="Kariyer Yolculuğu" className="h-fit">
          <ul className="space-y-3" role="list">
            {data.careerJourney.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="rounded px-2 py-0.5 text-xs font-medium ui-text-muted">
                    {CAREER_TYPE_LABELS[item.tip]}
                  </span>
                  <span className="text-xs ui-text-muted">{item.tarih}</span>
                </div>
                <p className="mt-1 text-sm font-medium text-[var(--color-text)]">
                  {item.baslik}
                </p>
                <p className="mt-0.5 text-xs ui-text-muted">{item.kisaAciklama}</p>
                {(item.onceMeta || item.sonraMeta) && (
                  <p className="mt-1 text-xs ui-text-muted">
                    {item.onceMeta && <span>{item.onceMeta}</span>}
                    {item.onceMeta && item.sonraMeta && <span> → </span>}
                    {item.sonraMeta && <span>{item.sonraMeta}</span>}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* B: Sistem İşlem Kayıtları (Audit Log) */}
        <SectionCard title="Sistem İşlem Kayıtları (Audit Log)" className="h-fit">
          <ul className="space-y-2" role="list">
            {data.auditLog.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/20 px-3 py-2.5 font-mono text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-[var(--color-text)]">
                    {item.islemTipi}
                  </span>
                  <span className="ui-text-muted">{item.tarihSaat}</span>
                </div>
                <p className="mt-0.5 ui-text-muted">{item.kisaAciklama}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 ui-text-muted">
                  <span>Yapan: {item.yapanKisi}</span>
                  {item.ipBilgisi && <span>IP: {item.ipBilgisi}</span>}
                  {item.cihazOturumOzeti && (
                    <span>Cihaz: {item.cihazOturumOzeti}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* C + D: Milestones & Revizyon Geçmişi — supporting */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* C: Milestones */}
        <SectionCard title="Milestones" className="h-fit">
          <ul className="space-y-2" role="list">
            {data.milestones.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">
                    {item.baslik}
                  </p>
                  {item.meta && (
                    <p className="text-xs ui-text-muted">{item.meta}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs ui-text-muted">{item.tarih}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${MILESTONE_STYLES[item.tip]}`}
                  >
                    {MILESTONE_TYPE_LABELS[item.tip]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* D: Revizyon Geçmişi */}
        <SectionCard title="Revizyon Geçmişi" className="h-fit">
          <ul className="space-y-2" role="list">
            {data.revisionHistory.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--color-text)]">
                    {item.belgeAdi}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs ui-text-muted">
                    <span>{item.versiyon}</span>
                    <span>·</span>
                    <span>{item.tarih}</span>
                    <span>·</span>
                    <span>{item.durum}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-2.5 py-1.5 text-xs font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
                >
                  Görüntüle
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
