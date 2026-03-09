"use client";

import InfoGridCard, { type InfoRow } from "./InfoGridCard";
import SectionCard from "./SectionCard";
import StatusSummaryCard, { type StatusItem } from "./StatusSummaryCard";
import TimelineListCard, { type TimelineItem } from "./TimelineListCard";

// ─── Data interfaces (for future real-data integration) ─────────────────────
export interface OverviewIdentityData {
  adSoyad: string;
  kurumsalEposta: string;
  kisiselEposta: string;
  telefon: string;
  unvan: string;
  departman: string;
  yonetici: string;
  lokasyon: string;
  iseGirisTarihi: string;
  toplamKidem: string;
  calismaModeli: string;
  sistemDurumu: string;
}

export interface OverviewOrgPositionData {
  costCenter: string;
  rbacRolu: string;
  sistemHesabiDurumu: string;
  maasBandi: string;
  modulSorumlulugu: string;
  hiyerarsikSeviye: string;
  kisaProfesyonelOzet: string;
}

export interface OverviewComplianceData {
  gmwDnaOnayi: StatusItem["status"];
  ndaDurumu: StatusItem["status"];
  isSozlesmesiDurumu: StatusItem["status"];
  arsivDurumu: StatusItem["status"];
}

export interface EventAssignment {
  event: string;
  role: string;
}

export interface OverviewResponsibilitiesData {
  etkinlikler: EventAssignment[];
  roller: string[];
  anaSorumluluklar: string[];
}

export interface ActivityEntry {
  iconKey: "assignment" | "task" | "role" | "performance" | "contract";
  title: string;
  description: string;
  time: string;
}

export interface OverviewData {
  identity: OverviewIdentityData;
  orgPosition: OverviewOrgPositionData;
  compliance: OverviewComplianceData;
  responsibilities: OverviewResponsibilitiesData;
  activity: ActivityEntry[];
}

// ─── Icons ──────────────────────────────────────────────────────────────────
const ICONS = {
  assignment: (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  task: (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  role: (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  performance: (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  contract: (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
} as const;

// ─── Data transformers (identity → props) ───────────────────────────────────
function identityToRows(d: OverviewIdentityData): InfoRow[] {
  return [
    { label: "Ad Soyad", value: d.adSoyad },
    { label: "Kurumsal E-posta", value: d.kurumsalEposta },
    { label: "Kişisel E-posta", value: d.kisiselEposta },
    { label: "Telefon", value: d.telefon },
    { label: "Ünvan", value: d.unvan },
    { label: "Departman", value: d.departman },
    { label: "Yönetici", value: d.yonetici },
    { label: "Lokasyon", value: d.lokasyon },
    { label: "İşe Giriş Tarihi", value: d.iseGirisTarihi },
    { label: "Toplam Kıdem", value: d.toplamKidem },
    { label: "Çalışma Modeli", value: d.calismaModeli },
    { label: "Sistem Durumu", value: d.sistemDurumu },
  ];
}

function orgPositionToRows(d: OverviewOrgPositionData): InfoRow[] {
  return [
    { label: "Cost Center", value: d.costCenter },
    { label: "RBAC Rolü", value: d.rbacRolu },
    { label: "Sistem Hesabı Durumu", value: d.sistemHesabiDurumu },
    { label: "Maaş Bandı", value: d.maasBandi },
    { label: "Modül Sorumluluğu", value: d.modulSorumlulugu },
    { label: "Hiyerarşik Seviye", value: d.hiyerarsikSeviye },
  ];
}

function complianceToItems(d: OverviewComplianceData): StatusItem[] {
  return [
    { label: "GMW DNA Onayı", status: d.gmwDnaOnayi },
    { label: "NDA Durumu", status: d.ndaDurumu },
    { label: "İş Sözleşmesi Durumu", status: d.isSozlesmesiDurumu },
    { label: "Arşiv Durumu", status: d.arsivDurumu },
  ];
}

function activityToTimelineItems(entries: ActivityEntry[]): TimelineItem[] {
  return entries.map((e) => ({
    icon: ICONS[e.iconKey],
    title: e.title,
    description: e.description,
    time: e.time,
  }));
}

// ─── Mock data ─────────────────────────────────────────────────────────────
const MOCK_DATA: OverviewData = {
  identity: {
    adSoyad: "Selçuk Kurt",
    kurumsalEposta: "selcuk.kurt@genericmusicworld.com",
    kisiselEposta: "selcuk.kurt.personal@gmail.com",
    telefon: "+90 532 123 45 67",
    unvan: "Senior Producer",
    departman: "Prodüksiyon & Operasyonlar",
    yonetici: "Ahmet Yılmaz",
    lokasyon: "İstanbul, Türkiye",
    iseGirisTarihi: "15.03.2019",
    toplamKidem: "5 yıl 11 ay",
    calismaModeli: "Hibrit",
    sistemDurumu: "Aktif",
  },
  orgPosition: {
    costCenter: "CC-PROD-001",
    rbacRolu: "Admin",
    sistemHesabiDurumu: "Aktif",
    maasBandi: "P3 - Senior",
    modulSorumlulugu: "M02 Events, M04 Personel",
    hiyerarsikSeviye: "L3 - Kıdemli",
    kisaProfesyonelOzet:
      "Müzik endüstrisinde 10+ yıllık deneyim. Etkinlik prodüksiyonu, sahne yönetimi ve sanatçı koordinasyonu alanlarında uzman. İstanbul Music Summit ve Berlin Showcase gibi büyük ölçekli projelerde sorumlu rol üstlenmiştir.",
  },
  compliance: {
    gmwDnaOnayi: "ok",
    ndaDurumu: "ok",
    isSozlesmesiDurumu: "ok",
    arsivDurumu: "pending",
  },
  responsibilities: {
    etkinlikler: [
      { event: "Istanbul Music Summit 2026", role: "Sahne Yöneticisi" },
      { event: "Berlin Showcase", role: "Prodüksiyon Sorumlusu" },
    ],
    roller: ["Event Admin", "Personel Görüntüleyici"],
    anaSorumluluklar: [
      "Q2 Artist Operations Review — Koordinasyon",
      "Yıllık Bütçe Planlaması — Katkı",
    ],
  },
  activity: [
    {
      iconKey: "assignment",
      title: "Event ataması güncellendi",
      description: "Istanbul Music Summit 2026 — Sahne Yöneticisi",
      time: "2 saat önce",
    },
    {
      iconKey: "task",
      title: "Görev tamamlandı",
      description: "Prodüksiyon checklist onaylandı",
      time: "1 gün önce",
    },
    {
      iconKey: "role",
      title: "RBAC rolü değiştirildi",
      description: "Event Admin rolü eklendi",
      time: "3 gün önce",
    },
    {
      iconKey: "performance",
      title: "Performans notu eklendi",
      description: "Q1 2025 değerlendirmesi",
      time: "1 hafta önce",
    },
    {
      iconKey: "contract",
      title: "Sözleşme görüntülendi",
      description: "İş sözleşmesi v2.1",
      time: "2 hafta önce",
    },
  ],
};

// ─── Component ─────────────────────────────────────────────────────────────
type OverviewTabContentProps = {
  data?: Partial<OverviewData>;
};

export default function OverviewTabContent({ data: dataOverride }: OverviewTabContentProps = {}) {
  const data: OverviewData = {
    identity: { ...MOCK_DATA.identity, ...dataOverride?.identity },
    orgPosition: { ...MOCK_DATA.orgPosition, ...dataOverride?.orgPosition },
    compliance: { ...MOCK_DATA.compliance, ...dataOverride?.compliance },
    responsibilities: { ...MOCK_DATA.responsibilities, ...dataOverride?.responsibilities },
    activity: dataOverride?.activity ?? MOCK_DATA.activity,
  };

  const identityRows = identityToRows(data.identity);
  const orgRows = orgPositionToRows(data.orgPosition);
  const complianceItems = complianceToItems(data.compliance);
  const timelineItems = activityToTimelineItems(data.activity);

  const orgFooter = (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wider ui-text-muted">
        Kısa Profesyonel Özet
      </p>
      <p className="text-sm leading-relaxed text-[var(--color-text)]">
        {data.orgPosition.kisaProfesyonelOzet}
      </p>
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      {/* A + B: Kimlik Özeti & Organizasyon Pozisyonu — side-by-side on large screens */}
      <div className="grid gap-6 lg:grid-cols-2">
        <InfoGridCard
          title="Kimlik Özeti"
          rows={identityRows}
          columns={2}
          className="h-fit"
        />
        <InfoGridCard
          title="Organizasyon Pozisyonu"
          rows={orgRows}
          columns={2}
          footer={orgFooter}
          className="h-fit"
        />
      </div>

      {/* C: Uyum Durumu — compact full-width */}
      <StatusSummaryCard title="Uyum Durumu" items={complianceItems} columns={4} />

      {/* D: Aktif Sorumluluklar — three balanced cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <SectionCard title="Atandığı Etkinlikler">
          <ul className="space-y-3" role="list">
            {data.responsibilities.etkinlikler.map((e, i) => (
              <li
                key={i}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 px-4 py-3 transition-colors hover:bg-[var(--color-surface2)]/50"
              >
                <p className="text-sm font-medium text-[var(--color-text)]">{e.event}</p>
                <p className="mt-0.5 text-xs ui-text-muted">{e.role}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="Üstlendiği Roller">
          <ul className="space-y-2" role="list">
            {data.responsibilities.roller.map((r, i) => (
              <li
                key={i}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 px-4 py-2.5 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface2)]/50"
              >
                {r}
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="Devam Eden Ana Sorumluluklar">
          <ul className="space-y-2" role="list">
            {data.responsibilities.anaSorumluluklar.map((s, i) => (
              <li
                key={i}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 px-4 py-2.5 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface2)]/50"
              >
                {s}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* E: Son Aktivite — timeline */}
      <TimelineListCard title="Son Aktivite" items={timelineItems} />
    </div>
  );
}
