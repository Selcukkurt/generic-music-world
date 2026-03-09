"use client";

import SectionCard from "./SectionCard";

// ─── Data interfaces (for future real-data integration) ─────────────────────
export interface PerformanceSummaryData {
  genelPuan: string;
  feedbackSayisi: number;
  etkinlikKatkisi: string;
  sonDegerlendirmeTarihi: string;
}

export interface CompetencyItem {
  id: string;
  label: string;
  score: number; // 0–100
}

export type FeedbackType = "yonetici" | "ekip" | "peer" | "self";

export interface FeedbackItem {
  id: string;
  degerlendirenKisi: string;
  degerlendirmeTipi: FeedbackType;
  puan: number;
  kisaYorum: string;
  tarih: string;
}

export interface DevelopmentAreasData {
  gucluYonler: string[];
  gelisimAlanlari: string[];
  onerilenSonrakiAdim: string;
}

export interface TrainingCertificationItem {
  id: string;
  ad: string;
  kurumKaynak: string;
  tamamlanmaTarihi: string;
  gecerlilikDurumu: string;
  belgeDurumu: string;
}

export interface TrendDataPoint {
  period: string;
  value: number;
}

export interface PerformanceTabData {
  performanceSummary: PerformanceSummaryData;
  competencies: CompetencyItem[];
  feedback: FeedbackItem[];
  developmentAreas: DevelopmentAreasData;
  trainingCertifications: TrainingCertificationItem[];
  trendData: TrendDataPoint[];
}

// ─── Feedback type labels ──────────────────────────────────────────────────
const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  yonetici: "Yönetici",
  ekip: "Ekip",
  peer: "Peer",
  self: "Self",
};

const FEEDBACK_TYPE_STYLES: Record<FeedbackType, string> = {
  yonetici: "bg-blue-500/20 text-blue-200",
  ekip: "bg-emerald-500/20 text-emerald-200",
  peer: "bg-amber-500/20 text-amber-200",
  self: "bg-[var(--color-surface2)] ui-text-muted",
};

// ─── Mock data ─────────────────────────────────────────────────────────────
const MOCK_DATA: PerformanceTabData = {
  performanceSummary: {
    genelPuan: "4.2 / 5",
    feedbackSayisi: 8,
    etkinlikKatkisi: "12 etkinlik",
    sonDegerlendirmeTarihi: "15.01.2026",
  },
  competencies: [
    { id: "1", label: "Teknik Yetkinlik", score: 85 },
    { id: "2", label: "Operasyonel Disiplin", score: 90 },
    { id: "3", label: "Liderlik", score: 75 },
    { id: "4", label: "Ekip Uyumu", score: 88 },
    { id: "5", label: "Zaman Yönetimi", score: 72 },
    { id: "6", label: "GMW DNA Uyum Skoru", score: 92 },
  ],
  feedback: [
    {
      id: "1",
      degerlendirenKisi: "Ahmet Yılmaz",
      degerlendirmeTipi: "yonetici",
      puan: 4.5,
      kisaYorum: "Etkinlik prodüksiyonunda güçlü performans. Sahne yönetimi alanında örnek çalışma.",
      tarih: "15.01.2026",
    },
    {
      id: "2",
      degerlendirenKisi: "Marcus Chen",
      degerlendirmeTipi: "peer",
      puan: 4.0,
      kisaYorum: "Koordinasyon ve iletişim çok iyi. Proje teslimlerinde tutarlı.",
      tarih: "12.01.2026",
    },
    {
      id: "3",
      degerlendirenKisi: "Selçuk Kurt",
      degerlendirmeTipi: "self",
      puan: 4.0,
      kisaYorum: "Teknik alanda güçlü, liderlik gelişimine odaklanıyorum.",
      tarih: "10.01.2026",
    },
  ],
  developmentAreas: {
    gucluYonler: [
      "Etkinlik prodüksiyonu ve sahne yönetimi",
      "Stakeholder koordinasyonu",
      "Teknik problem çözme",
    ],
    gelisimAlanlari: [
      "Liderlik ve ekip yönetimi",
      "Sunum ve topluluk önünde konuşma",
    ],
    onerilenSonrakiAdim: "Q2'de liderlik eğitimi ve mentorluk programına katılım önerilir.",
  },
  trainingCertifications: [
    {
      id: "1",
      ad: "Proje Yönetimi Temelleri",
      kurumKaynak: "GMW Academy",
      tamamlanmaTarihi: "15.06.2024",
      gecerlilikDurumu: "Süresiz",
      belgeDurumu: "Onaylı",
    },
    {
      id: "2",
      ad: "Etkinlik Prodüksiyonu Sertifikası",
      kurumKaynak: "EventPro",
      tamamlanmaTarihi: "20.03.2025",
      gecerlilikDurumu: "2 yıl",
      belgeDurumu: "Onaylı",
    },
    {
      id: "3",
      ad: "GMW DNA Onboarding",
      kurumKaynak: "İK",
      tamamlanmaTarihi: "01.04.2019",
      gecerlilikDurumu: "Süresiz",
      belgeDurumu: "Onaylı",
    },
  ],
  trendData: [
    { period: "Ocak", value: 4.2 },
    { period: "Şubat", value: 4.0 },
    { period: "Mart", value: 4.3 },
    { period: "Nisan", value: 4.1 },
  ],
};

// ─── Progress bar helper ───────────────────────────────────────────────────
function ProgressBar({ score, label }: { score: number; label: string }) {
  const pct = Math.min(100, Math.max(0, score));
  const color =
    pct >= 80
      ? "bg-emerald-500"
      : pct >= 60
        ? "bg-amber-500"
        : "bg-red-500/80";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium ui-text-muted">{label}</span>
        <span className="text-xs font-medium text-[var(--color-text)]">{score}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface2)]">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────
type PerformanceTabContentProps = {
  data?: Partial<PerformanceTabData>;
};

export default function PerformanceTabContent({
  data: dataOverride,
}: PerformanceTabContentProps = {}) {
  const data: PerformanceTabData = {
    performanceSummary: { ...MOCK_DATA.performanceSummary, ...dataOverride?.performanceSummary },
    competencies: dataOverride?.competencies ?? MOCK_DATA.competencies,
    feedback: dataOverride?.feedback ?? MOCK_DATA.feedback,
    developmentAreas: { ...MOCK_DATA.developmentAreas, ...dataOverride?.developmentAreas },
    trainingCertifications:
      dataOverride?.trainingCertifications ?? MOCK_DATA.trainingCertifications,
    trendData: dataOverride?.trendData ?? MOCK_DATA.trendData,
  };

  const maxTrendValue = 5; // Puan 0–5 ölçeğinde

  return (
    <div className="flex flex-col gap-8">
      {/* A: Performans Özeti — KPI cards */}
      <SectionCard title="Performans Özeti">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 p-4">
            <p className="text-xs font-medium uppercase tracking-wider ui-text-muted">
              Genel Puan
            </p>
            <p className="mt-1 text-xl font-bold text-[var(--color-text)]">
              {data.performanceSummary.genelPuan}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 p-4">
            <p className="text-xs font-medium uppercase tracking-wider ui-text-muted">
              Feedback Sayısı
            </p>
            <p className="mt-1 text-xl font-bold text-[var(--color-text)]">
              {data.performanceSummary.feedbackSayisi}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 p-4">
            <p className="text-xs font-medium uppercase tracking-wider ui-text-muted">
              Etkinlik Katkısı
            </p>
            <p className="mt-1 text-xl font-bold text-[var(--color-text)]">
              {data.performanceSummary.etkinlikKatkisi}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 p-4">
            <p className="text-xs font-medium uppercase tracking-wider ui-text-muted">
              Son Değerlendirme Tarihi
            </p>
            <p className="mt-1 text-lg font-bold text-[var(--color-text)]">
              {data.performanceSummary.sonDegerlendirmeTarihi}
            </p>
          </div>
        </div>
      </SectionCard>

      {/* B: Yetkinlik Barometresi — main focus */}
      <SectionCard title="Yetkinlik Barometresi">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.competencies.map((c) => (
            <ProgressBar key={c.id} score={c.score} label={c.label} />
          ))}
        </div>
      </SectionCard>

      {/* C: 360° Geri Bildirim */}
      <SectionCard title="360° Geri Bildirim">
        <ul className="space-y-3" role="list">
          {data.feedback.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 px-4 py-3 transition-colors hover:bg-[var(--color-surface2)]/50"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">
                    {item.degerlendirenKisi}
                  </p>
                  <span
                    className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${FEEDBACK_TYPE_STYLES[item.degerlendirmeTipi]}`}
                  >
                    {FEEDBACK_TYPE_LABELS[item.degerlendirmeTipi]}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-[var(--color-text)]">
                    {item.puan}
                  </span>
                  <span className="text-xs ui-text-muted">/ 5</span>
                </div>
              </div>
              <p className="mt-2 text-sm leading-relaxed ui-text-muted">{item.kisaYorum}</p>
              <p className="mt-1 text-xs ui-text-muted">{item.tarih}</p>
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* D: Gelişim Alanları */}
      <SectionCard title="Gelişim Alanları">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider ui-text-muted">
              Güçlü Yönler
            </p>
            <ul className="mt-2 space-y-1" role="list">
              {data.developmentAreas.gucluYonler.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text)]">
                  <span className="text-emerald-400">•</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider ui-text-muted">
              Gelişim Alanları
            </p>
            <ul className="mt-2 space-y-1" role="list">
              {data.developmentAreas.gelisimAlanlari.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text)]">
                  <span className="text-amber-400">•</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/20 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider ui-text-muted">
              Önerilen Sonraki Adım
            </p>
            <p className="mt-1 text-sm text-[var(--color-text)]">
              {data.developmentAreas.onerilenSonrakiAdim}
            </p>
          </div>
        </div>
      </SectionCard>

      {/* E + F: Eğitim & Sertifikalar + Performans Trendi — side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* E: Eğitim & Sertifikalar */}
        <SectionCard title="Eğitim & Sertifikalar" className="h-fit">
          <ul className="space-y-2" role="list">
            {data.trainingCertifications.map((t) => (
              <li
                key={t.id}
                className="flex flex-col gap-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 px-3 py-2.5"
              >
                <p className="text-sm font-medium text-[var(--color-text)]">{t.ad}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs ui-text-muted">
                  <span>{t.kurumKaynak}</span>
                  <span>·</span>
                  <span>{t.tamamlanmaTarihi}</span>
                  <span>·</span>
                  <span>{t.gecerlilikDurumu}</span>
                  <span>·</span>
                  <span>{t.belgeDurumu}</span>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* F: Performans Trendi — compact visual card */}
        <SectionCard title="Performans Trendi" className="h-fit">
          <p className="mb-4 text-xs ui-text-muted">
            Aylık genel puan ortalaması (son 4 ay)
          </p>
          <div className="flex items-end justify-between gap-2">
            {data.trendData.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full min-w-0 max-w-16 rounded-t bg-[var(--color-primary)]/60 transition-all"
                  style={{
                    height: `${Math.max(12, (d.value / maxTrendValue) * 96)}px`,
                  }}
                  title={`${d.period}: ${d.value}`}
                />
                <span className="text-xs font-medium text-[var(--color-text)]">{d.value}</span>
                <span className="text-xs ui-text-muted">{d.period}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
