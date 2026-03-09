"use client";

import InfoGridCard, { type InfoRow } from "./InfoGridCard";
import SectionCard from "./SectionCard";

// ─── Data interfaces (for future real-data integration) ─────────────────────
export interface HierarchyNode {
  id: string;
  adSoyad: string;
  unvan: string;
  isCurrentPerson?: boolean;
}

export interface HierarchySchemaData {
  ustYonetici: HierarchyNode | null;
  mevcutPersonel: HierarchyNode;
  direktRaporlayanlar: HierarchyNode[];
}

export interface ReportingAuthorityData {
  dogrudanYonetici: string;
  fonksiyonelYonetici: string;
  hiyerarsikSeviye: string;
  onayZinciri: string;
  modulSorumlulugu: string;
  departmanSahibi: string;
}

export interface DepartmentInfoData {
  departman: string;
  butce: string;
  costCenter: string;
  departmanBaskani: string;
  ekipUyeSayisi: string;
  anaSorumlulukAlani: string;
}

export interface DelegationData {
  aktifVekalet: boolean;
  vekaletVerilenKisi: string;
  baslangicTarihi: string;
  bitisTarihi: string;
  notAciklama: string;
}

export interface FallbackRule {
  id: string;
  kosul: string;
  sonuc: string;
}

export interface OrganizationTabData {
  hierarchySchema: HierarchySchemaData;
  reportingAuthority: ReportingAuthorityData;
  departmentInfo: DepartmentInfoData;
  delegation: DelegationData;
  fallbackRules: FallbackRule[];
}

// ─── Data transformers ──────────────────────────────────────────────────────
function reportingToRows(d: ReportingAuthorityData): InfoRow[] {
  return [
    { label: "Doğrudan Yönetici", value: d.dogrudanYonetici },
    { label: "Fonksiyonel Yönetici", value: d.fonksiyonelYonetici },
    { label: "Hiyerarşik Seviye", value: d.hiyerarsikSeviye },
    { label: "Onay Zinciri", value: d.onayZinciri },
    { label: "Modül Sorumluluğu", value: d.modulSorumlulugu },
    { label: "Departman Sahibi", value: d.departmanSahibi },
  ];
}

function departmentToRows(d: DepartmentInfoData): InfoRow[] {
  return [
    { label: "Departman", value: d.departman },
    { label: "Bütçe", value: d.butce },
    { label: "Cost Center", value: d.costCenter },
    { label: "Departman Başkanı", value: d.departmanBaskani },
    { label: "Ekip Üye Sayısı", value: d.ekipUyeSayisi },
    { label: "Ana Sorumluluk Alanı", value: d.anaSorumlulukAlani },
  ];
}

// ─── Mock data ─────────────────────────────────────────────────────────────
const MOCK_DATA: OrganizationTabData = {
  hierarchySchema: {
    ustYonetici: {
      id: "1",
      adSoyad: "Ahmet Yılmaz",
      unvan: "CEO / Genel Müdür",
    },
    mevcutPersonel: {
      id: "2",
      adSoyad: "Selçuk Kurt",
      unvan: "Senior Producer",
      isCurrentPerson: true,
    },
    direktRaporlayanlar: [
      {
        id: "3",
        adSoyad: "Marcus Chen",
        unvan: "Lead Engineer",
      },
    ],
  },
  reportingAuthority: {
    dogrudanYonetici: "Ahmet Yılmaz",
    fonksiyonelYonetici: "Ahmet Yılmaz",
    hiyerarsikSeviye: "L3 - Kıdemli",
    onayZinciri: "Yönetici → CEO",
    modulSorumlulugu: "M02 Events, M04 Personel",
    departmanSahibi: "Ahmet Yılmaz",
  },
  departmentInfo: {
    departman: "Prodüksiyon & Operasyonlar",
    butce: "₺2.4M / yıl",
    costCenter: "CC-PROD-001",
    departmanBaskani: "Ahmet Yılmaz",
    ekipUyeSayisi: "12",
    anaSorumlulukAlani: "Etkinlik prodüksiyonu, sahne yönetimi, operasyon koordinasyonu",
  },
  delegation: {
    aktifVekalet: false,
    vekaletVerilenKisi: "—",
    baslangicTarihi: "—",
    bitisTarihi: "—",
    notAciklama: "Aktif vekalet bulunmuyor.",
  },
  fallbackRules: [
    {
      id: "1",
      kosul: "Eğer direkt yönetici yoksa",
      sonuc: "Fonksiyonel yönetici devreye girer.",
    },
    {
      id: "2",
      kosul: "Eğer departman sahibi yoksa",
      sonuc: "Üst seviye departman başkanı devralır.",
    },
    {
      id: "3",
      kosul: "Eğer modül owner boşsa",
      sonuc: "Görev sistem admin'e atanır.",
    },
  ],
};

// ─── Hierarchy connector (arrow) ────────────────────────────────────────────
function HierarchyConnector() {
  return (
    <div className="flex justify-center py-1">
      <span className="text-lg ui-text-muted">↓</span>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────
type OrganizationTabContentProps = {
  data?: Partial<OrganizationTabData>;
};

export default function OrganizationTabContent({
  data: dataOverride,
}: OrganizationTabContentProps = {}) {
  const data: OrganizationTabData = {
    hierarchySchema: { ...MOCK_DATA.hierarchySchema, ...dataOverride?.hierarchySchema },
    reportingAuthority: { ...MOCK_DATA.reportingAuthority, ...dataOverride?.reportingAuthority },
    departmentInfo: { ...MOCK_DATA.departmentInfo, ...dataOverride?.departmentInfo },
    delegation: { ...MOCK_DATA.delegation, ...dataOverride?.delegation },
    fallbackRules: dataOverride?.fallbackRules ?? MOCK_DATA.fallbackRules,
  };

  const reportingRows = reportingToRows(data.reportingAuthority);
  const departmentRows = departmentToRows(data.departmentInfo);

  return (
    <div className="flex flex-col gap-8">
      {/* A: Hiyerarşi Şeması — main focus */}
      <SectionCard title="Hiyerarşi Şeması">
        <div className="flex flex-col items-center">
          {data.hierarchySchema.ustYonetici && (
            <>
              <div className="w-full max-w-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 px-4 py-3 text-center">
                <p className="text-sm font-medium text-[var(--color-text)]">
                  {data.hierarchySchema.ustYonetici.adSoyad}
                </p>
                <p className="text-xs ui-text-muted">
                  {data.hierarchySchema.ustYonetici.unvan}
                </p>
              </div>
              <HierarchyConnector />
            </>
          )}

          <div
            className={`w-full max-w-xs rounded-lg border-2 px-4 py-3 text-center ${
              data.hierarchySchema.mevcutPersonel.isCurrentPerson
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                : "border-[var(--color-border)] bg-[var(--color-surface2)]/30"
            }`}
          >
            <p className="text-sm font-medium text-[var(--color-text)]">
              {data.hierarchySchema.mevcutPersonel.adSoyad}
            </p>
            <p className="text-xs ui-text-muted">
              {data.hierarchySchema.mevcutPersonel.unvan}
            </p>
            {data.hierarchySchema.mevcutPersonel.isCurrentPerson && (
              <span className="mt-1 inline-block text-xs font-medium ui-text-muted">
                (Mevcut personel)
              </span>
            )}
          </div>

          {data.hierarchySchema.direktRaporlayanlar.length > 0 && (
            <>
              <HierarchyConnector />
              <div className="flex w-full max-w-md flex-col gap-2">
                {data.hierarchySchema.direktRaporlayanlar.map((person) => (
                  <div
                    key={person.id}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 px-4 py-3 text-center"
                  >
                    <p className="text-sm font-medium text-[var(--color-text)]">
                      {person.adSoyad}
                    </p>
                    <p className="text-xs ui-text-muted">{person.unvan}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </SectionCard>

      {/* B + C: Raporlama/Yetki & Departman — side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <InfoGridCard
          title="Raporlama ve Yetki Akışı"
          rows={reportingRows}
          columns={2}
          className="h-fit"
        />
        <InfoGridCard
          title="Departman Bilgisi"
          rows={departmentRows}
          columns={2}
          className="h-fit"
        />
      </div>

      {/* D: Vekalet Durumu */}
      <SectionCard title="Vekalet Durumu">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wider ui-text-muted">
                Aktif Vekalet
              </span>
              <span className="text-sm font-medium text-[var(--color-text)]">
                {data.delegation.aktifVekalet ? "Evet" : "Hayır"}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wider ui-text-muted">
                Vekalet Verilen Kişi
              </span>
              <span className="text-sm font-medium text-[var(--color-text)]">
                {data.delegation.vekaletVerilenKisi}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wider ui-text-muted">
                Başlangıç Tarihi
              </span>
              <span className="text-sm font-medium text-[var(--color-text)]">
                {data.delegation.baslangicTarihi}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wider ui-text-muted">
                Bitiş Tarihi
              </span>
              <span className="text-sm font-medium text-[var(--color-text)]">
                {data.delegation.bitisTarihi}
              </span>
            </div>
          </div>
          {data.delegation.notAciklama && (
            <p className="text-sm ui-text-muted">{data.delegation.notAciklama}</p>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-3 py-1.5 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
            >
              + Vekalet Ata
            </button>
            <button
              type="button"
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-3 py-1.5 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
            >
              Vekalet Detayı
            </button>
          </div>
        </div>
      </SectionCard>

      {/* E: Hiyerarşik Fallback */}
      <SectionCard title="Hiyerarşik Fallback">
        <p className="mb-4 text-xs ui-text-muted">
          Yetki ve sorumluluk devri kuralları — boş pozisyonlarda kim devreye girer.
        </p>
        <ul className="space-y-2" role="list">
          {data.fallbackRules.map((rule) => (
            <li
              key={rule.id}
              className="flex flex-col gap-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/20 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-3"
            >
              <span className="text-sm font-medium text-[var(--color-text)]">
                {rule.kosul}
              </span>
              <span className="text-sm ui-text-muted">→</span>
              <span className="text-sm ui-text-muted">{rule.sonuc}</span>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
