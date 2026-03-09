"use client";

import InfoGridCard, { type InfoRow } from "./InfoGridCard";
import SectionCard from "./SectionCard";
import type { StatusItem, StatusType } from "./StatusSummaryCard";

// ─── Data interfaces (for future real-data integration) ─────────────────────
export interface AgreementFrameworkData {
  calismaModeli: string;
  sozlesmeTipi: string;
  baslangicTarihi: string;
  bitisTarihi: string;
  kalanGun: number | null;
  gmwDnaOnayi: StatusType;
  ndaDurumu: StatusType;
  isSozlesmesiDurumu: StatusType;
}

export interface PaymentMethodData {
  odemeTuru: string;
  faturaGerekliligi: string;
  vergiBelgeDurumu: string;
  odemeKanali: string;
  hesapYontemOzeti: string;
}

export interface DynamicEarningItem {
  id: string;
  label: string;
  amount?: string;
  date?: string;
}

export interface DynamicHakedisData {
  temelUcret: string;
  bonusModeli: string;
  projeBazliEkOdeme: string;
  toplamTahakkuk: string;
  sonOdemeTarihi: string;
  guncelOdemeStatusu: string;
  recentEarnings: DynamicEarningItem[];
}

export interface DocumentArchiveItem {
  id: string;
  belgeAdi: string;
  belgeTipi: string;
  tarih: string;
  versiyonDurum: string;
}

export interface FinanceTabData {
  agreementFramework: AgreementFrameworkData;
  paymentMethod: PaymentMethodData;
  dynamicHakedis: DynamicHakedisData;
  documentArchive: DocumentArchiveItem[];
}

// ─── Data transformers ──────────────────────────────────────────────────────
function agreementToRows(d: AgreementFrameworkData): InfoRow[] {
  const kalanGun = d.kalanGun !== null ? `${d.kalanGun} gün` : "—";
  return [
    { label: "Çalışma Modeli", value: d.calismaModeli },
    { label: "Sözleşme Tipi", value: d.sozlesmeTipi },
    { label: "Başlangıç Tarihi", value: d.baslangicTarihi },
    { label: "Bitiş Tarihi", value: d.bitisTarihi },
    { label: "Kalan Gün", value: kalanGun },
  ];
}

function agreementToStatusItems(d: AgreementFrameworkData): StatusItem[] {
  return [
    { label: "GMW DNA Onayı", status: d.gmwDnaOnayi },
    { label: "NDA Durumu", status: d.ndaDurumu },
    { label: "İş Sözleşmesi Durumu", status: d.isSozlesmesiDurumu },
  ];
}

function paymentMethodToRows(d: PaymentMethodData): InfoRow[] {
  return [
    { label: "Ödeme Türü", value: d.odemeTuru },
    { label: "Fatura Gerekliliği", value: d.faturaGerekliligi },
    { label: "Vergi / Belge Durumu", value: d.vergiBelgeDurumu },
    { label: "Ödeme Kanalı", value: d.odemeKanali },
    { label: "Hesap / Yöntem Özeti", value: d.hesapYontemOzeti },
  ];
}

function dynamicHakedisToRows(d: DynamicHakedisData): InfoRow[] {
  return [
    { label: "Temel Ücret", value: d.temelUcret },
    { label: "Bonus Modeli", value: d.bonusModeli },
    { label: "Proje Bazlı Ek Ödeme", value: d.projeBazliEkOdeme },
    { label: "Toplam Tahakkuk", value: d.toplamTahakkuk },
    { label: "Son Ödeme Tarihi", value: d.sonOdemeTarihi },
    { label: "Güncel Ödeme Statüsü", value: d.guncelOdemeStatusu },
  ];
}

// ─── Mock data ─────────────────────────────────────────────────────────────
const MOCK_DATA: FinanceTabData = {
  agreementFramework: {
    calismaModeli: "Hibrit",
    sozlesmeTipi: "Belirsiz Süreli",
    baslangicTarihi: "15.03.2019",
    bitisTarihi: "15.03.2026",
    kalanGun: 35,
    gmwDnaOnayi: "ok",
    ndaDurumu: "ok",
    isSozlesmesiDurumu: "ok",
  },
  paymentMethod: {
    odemeTuru: "Aylık Bordro",
    faturaGerekliligi: "Gerekli değil",
    vergiBelgeDurumu: "Beyanname tamam",
    odemeKanali: "Banka Havalesi",
    hesapYontemOzeti: "TR XX XXXX ... 1234",
  },
  dynamicHakedis: {
    temelUcret: "₺85.000 / ay",
    bonusModeli: "Performans + Proje",
    projeBazliEkOdeme: "Etkinlik bazlı",
    toplamTahakkuk: "₺92.400",
    sonOdemeTarihi: "31.01.2026",
    guncelOdemeStatusu: "Ödendi",
    recentEarnings: [
      { id: "1", label: "Istanbul Music Summit hakedişi", amount: "₺4.200", date: "15.01.2026" },
      { id: "2", label: "Berlin Showcase ek ödemesi", amount: "₺2.800", date: "10.01.2026" },
      { id: "3", label: "Q1 operasyon bonusu", amount: "₺3.600", date: "05.01.2026" },
    ],
  },
  documentArchive: [
    {
      id: "1",
      belgeAdi: "İş Sözleşmesi",
      belgeTipi: "Sözleşme",
      tarih: "15.03.2024",
      versiyonDurum: "v2.1",
    },
    {
      id: "2",
      belgeAdi: "NDA Belgesi",
      belgeTipi: "Gizlilik",
      tarih: "10.02.2019",
      versiyonDurum: "Onaylı",
    },
    {
      id: "3",
      belgeAdi: "Ocak 2026 Faturası",
      belgeTipi: "Fatura / Voucher",
      tarih: "31.01.2026",
      versiyonDurum: "Ödendi",
    },
    {
      id: "4",
      belgeAdi: "Aralık 2025 Bordro",
      belgeTipi: "Bordro / Ödeme Belgesi",
      tarih: "15.12.2025",
      versiyonDurum: "v1",
    },
  ],
};

// ─── Component ─────────────────────────────────────────────────────────────
type FinanceTabContentProps = {
  data?: Partial<FinanceTabData>;
};

export default function FinanceTabContent({ data: dataOverride }: FinanceTabContentProps = {}) {
  const data: FinanceTabData = {
    agreementFramework: { ...MOCK_DATA.agreementFramework, ...dataOverride?.agreementFramework },
    paymentMethod: { ...MOCK_DATA.paymentMethod, ...dataOverride?.paymentMethod },
    dynamicHakedis: { ...MOCK_DATA.dynamicHakedis, ...dataOverride?.dynamicHakedis },
    documentArchive: dataOverride?.documentArchive ?? MOCK_DATA.documentArchive,
  };

  const agreementRows = agreementToRows(data.agreementFramework);
  const agreementStatusItems = agreementToStatusItems(data.agreementFramework);
  const paymentRows = paymentMethodToRows(data.paymentMethod);
  const hakedisRows = dynamicHakedisToRows(data.dynamicHakedis);

  const agreementFooter = (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wider ui-text-muted">
        Uyum Durumu
      </p>
      <div className="grid grid-cols-3 gap-2">
        {agreementStatusItems.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/20 px-3 py-2"
          >
            <span className="text-xs ui-text-muted">{item.label}</span>
            <span
              className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${
                item.status === "ok"
                  ? "bg-emerald-500/20 text-emerald-200"
                  : item.status === "warning"
                    ? "bg-amber-500/20 text-amber-200"
                    : item.status === "pending"
                      ? "bg-blue-500/20 text-blue-200"
                      : "bg-[var(--color-surface2)] ui-text-muted"
              }`}
            >
              {item.status === "ok"
                ? "Onaylı"
                : item.status === "warning"
                  ? "Beklemede"
                  : item.status === "pending"
                    ? "İnceleniyor"
                    : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const hakedisFooter = (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wider ui-text-muted">
        Son Hakediş Kalemleri
      </p>
      <ul className="space-y-2" role="list">
        {data.dynamicHakedis.recentEarnings.map((e) => (
          <li
            key={e.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 px-3 py-2.5"
          >
            <span className="text-sm font-medium text-[var(--color-text)]">{e.label}</span>
            <div className="flex items-center gap-2 text-xs ui-text-muted">
              {e.amount ? <span>{e.amount}</span> : null}
              {e.date ? <span>· {e.date}</span> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      {/* A + B: Anlaşma Çerçevesi & Ödeme Yöntemi — side-by-side on large screens */}
      <div className="grid gap-6 lg:grid-cols-2">
        <InfoGridCard
          title="Anlaşma Çerçevesi"
          rows={agreementRows}
          columns={2}
          footer={agreementFooter}
          className="h-fit"
        />
        <InfoGridCard
          title="Ödeme Yöntemi"
          rows={paymentRows}
          columns={2}
          className="h-fit"
        />
      </div>

      {/* C: Dinamik Hakediş */}
      <InfoGridCard
        title="Dinamik Hakediş"
        rows={hakedisRows}
        columns={2}
        footer={hakedisFooter}
      />

      {/* D: Doküman Arşivi */}
      <SectionCard title="Doküman Arşivi">
        <ul className="space-y-2" role="list">
          {data.documentArchive.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 px-4 py-3 transition-colors hover:bg-[var(--color-surface2)]/50"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--color-text)]">{doc.belgeAdi}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs ui-text-muted">
                  <span>{doc.belgeTipi}</span>
                  <span>·</span>
                  <span>{doc.tarih}</span>
                  <span>·</span>
                  <span>{doc.versiyonDurum}</span>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-2.5 py-1.5 text-xs font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
                >
                  Görüntüle
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-2.5 py-1.5 text-xs font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
                >
                  İndir
                </button>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
