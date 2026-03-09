"use client";

import SectionCard from "./SectionCard";

// ─── Data interfaces (for future real-data integration) ─────────────────────
export type TaskPriority = "high" | "medium" | "low";

export type TaskStatus = "open" | "in_progress" | "blocked" | "completed";

export interface OpenTaskItem {
  id: string;
  gorevAdi: string;
  kisaAciklama: string;
  oncelik: TaskPriority;
  durum: TaskStatus;
  teslimTarihi: string;
  ilgiliAlan: string;
}

export interface CompletedTaskItem {
  id: string;
  gorevAdi: string;
  tamamlanmaTarihi: string;
  meta: string;
}

export type EventAssignmentStatus = "upcoming" | "ongoing" | "completed";

export interface EventAssignmentItem {
  id: string;
  etkinlikAdi: string;
  lokasyon: string;
  tarih: string;
  atananRol: string;
  durum: EventAssignmentStatus;
  operasyonOzeti: string;
}

export interface RelatedDocumentItem {
  id: string;
  belgeAdi: string;
  belgeTipi: string;
  tarih: string;
  boyutVersiyon: string;
}

export interface WorkloadTabData {
  openTasks: OpenTaskItem[];
  completedTasks: CompletedTaskItem[];
  eventAssignments: EventAssignmentItem[];
  relatedDocuments: RelatedDocumentItem[];
}

// ─── Priority styling ───────────────────────────────────────────────────────
const PRIORITY_STYLES: Record<TaskPriority, string> = {
  high: "border-l-red-500/60 bg-red-500/5",
  medium: "border-l-amber-500/60 bg-amber-500/5",
  low: "border-l-emerald-500/40 bg-emerald-500/5",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: "Yüksek",
  medium: "Orta",
  low: "Düşük",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  open: "Açık",
  in_progress: "Devam Ediyor",
  blocked: "Engelli",
  completed: "Tamamlandı",
};

const EVENT_STATUS_STYLES: Record<EventAssignmentStatus, string> = {
  upcoming: "bg-blue-500/20 text-blue-200",
  ongoing: "bg-amber-500/20 text-amber-200",
  completed: "bg-emerald-500/20 text-emerald-200",
};

const EVENT_STATUS_LABELS: Record<EventAssignmentStatus, string> = {
  upcoming: "Yaklaşan",
  ongoing: "Devam Eden",
  completed: "Tamamlandı",
};

// ─── Mock data ─────────────────────────────────────────────────────────────
const MOCK_DATA: WorkloadTabData = {
  openTasks: [
    {
      id: "1",
      gorevAdi: "Istanbul Music Summit sahne planı onayı",
      kisaAciklama: "Ana sahne ve yan sahnelerin teknik rider ile uyumlu planlaması",
      oncelik: "high",
      durum: "in_progress",
      teslimTarihi: "20.02.2026",
      ilgiliAlan: "Prodüksiyon",
    },
    {
      id: "2",
      gorevAdi: "Berlin Showcase sanatçı koordinasyonu",
      kisaAciklama: "Performans sırası ve green room düzenlemeleri",
      oncelik: "medium",
      durum: "open",
      teslimTarihi: "28.02.2026",
      ilgiliAlan: "Operasyon",
    },
    {
      id: "3",
      gorevAdi: "Q2 bütçe revizyonu katkısı",
      kisaAciklama: "Prodüksiyon maliyetleri özeti ve öneriler",
      oncelik: "low",
      durum: "open",
      teslimTarihi: "15.03.2026",
      ilgiliAlan: "Finans",
    },
  ],
  completedTasks: [
    {
      id: "1",
      gorevAdi: "IMS 2026 teknik rider hazırlığı",
      tamamlanmaTarihi: "05.02.2026",
      meta: "Prodüksiyon",
    },
    {
      id: "2",
      gorevAdi: "Berlin Showcase lojistik onayı",
      tamamlanmaTarihi: "01.02.2026",
      meta: "Operasyon",
    },
    {
      id: "3",
      gorevAdi: "Ocak ayı performans raporu",
      tamamlanmaTarihi: "28.01.2026",
      meta: "Raporlama",
    },
  ],
  eventAssignments: [
    {
      id: "1",
      etkinlikAdi: "Istanbul Music Summit 2026",
      lokasyon: "Harbiye",
      tarih: "15–17.05.2026",
      atananRol: "Sahne Yöneticisi",
      durum: "upcoming",
      operasyonOzeti: "Ana sahne ve 2 yan sahne koordinasyonu",
    },
    {
      id: "2",
      etkinlikAdi: "GMW Showcase Berlin",
      lokasyon: "Berlin Arena",
      tarih: "22.03.2026",
      atananRol: "Prodüksiyon Sorumlusu",
      durum: "upcoming",
      operasyonOzeti: "Teknik prodüksiyon ve sahne yönetimi",
    },
    {
      id: "3",
      etkinlikAdi: "A&R Talent Hunt Ankara",
      lokasyon: "Congresium",
      tarih: "10.01.2026",
      atananRol: "Jüri Üyesi",
      durum: "completed",
      operasyonOzeti: "Seçim paneli ve değerlendirme",
    },
  ],
  relatedDocuments: [
    {
      id: "1",
      belgeAdi: "Teknik Rider",
      belgeTipi: "Teknik Doküman",
      tarih: "01.02.2026",
      boyutVersiyon: "v3.2",
    },
    {
      id: "2",
      belgeAdi: "Etkinlik Planı",
      belgeTipi: "Planlama",
      tarih: "15.01.2026",
      boyutVersiyon: "2.4 MB",
    },
    {
      id: "3",
      belgeAdi: "Sunum Dosyası",
      belgeTipi: "Sunum",
      tarih: "20.01.2026",
      boyutVersiyon: "v1",
    },
    {
      id: "4",
      belgeAdi: "Operasyon Raporu",
      belgeTipi: "Rapor",
      tarih: "31.01.2026",
      boyutVersiyon: "Q1 2026",
    },
  ],
};

// ─── Component ─────────────────────────────────────────────────────────────
type TasksTabContentProps = {
  data?: Partial<WorkloadTabData>;
};

export default function TasksTabContent({ data: dataOverride }: TasksTabContentProps = {}) {
  const data: WorkloadTabData = {
    openTasks: dataOverride?.openTasks ?? MOCK_DATA.openTasks,
    completedTasks: dataOverride?.completedTasks ?? MOCK_DATA.completedTasks,
    eventAssignments: dataOverride?.eventAssignments ?? MOCK_DATA.eventAssignments,
    relatedDocuments: dataOverride?.relatedDocuments ?? MOCK_DATA.relatedDocuments,
  };

  return (
    <div className="flex flex-col gap-8">
      {/* A: Açık Görevler — main focus */}
      <SectionCard title="Açık Görevler">
        <ul className="space-y-3" role="list">
          {data.openTasks.map((task) => (
            <li
              key={task.id}
              className={`rounded-lg border border-[var(--color-border)] border-l-4 px-4 py-3 transition-colors hover:bg-[var(--color-surface2)]/30 ${PRIORITY_STYLES[task.oncelik]}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-[var(--color-text)]">
                      {task.gorevAdi}
                    </p>
                    <span className="rounded px-2 py-0.5 text-xs font-medium ui-text-muted">
                      {PRIORITY_LABELS[task.oncelik]}
                    </span>
                    <span className="rounded px-2 py-0.5 text-xs font-medium ui-text-muted">
                      {STATUS_LABELS[task.durum]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs ui-text-muted">{task.kisaAciklama}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-xs ui-text-muted">
                    <span>Teslim: {task.teslimTarihi}</span>
                    <span>·</span>
                    <span>{task.ilgiliAlan}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-2.5 py-1.5 text-xs font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
                  >
                    Aç
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-2.5 py-1.5 text-xs font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
                  >
                    Tamamla
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* B + C: Tamamlanan Görevler & Etkinlik Atamaları — side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* B: Tamamlanan Görevler — compact */}
        <SectionCard title="Tamamlanan Görevler" className="h-fit">
          <ul className="space-y-2" role="list">
            {data.completedTasks.map((task) => (
              <li
                key={task.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/20 px-3 py-2"
              >
                <span className="text-sm font-medium text-[var(--color-text)]">
                  {task.gorevAdi}
                </span>
                <div className="flex items-center gap-2 text-xs ui-text-muted">
                  <span>{task.tamamlanmaTarihi}</span>
                  <span>·</span>
                  <span>{task.meta}</span>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* C: Etkinlik Atamaları — main focus */}
        <SectionCard title="Etkinlik Atamaları" className="h-fit">
          <ul className="space-y-3" role="list">
            {data.eventAssignments.map((event) => (
              <li
                key={event.id}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 px-4 py-3 transition-colors hover:bg-[var(--color-surface2)]/50"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">
                      {event.etkinlikAdi}
                    </p>
                    <p className="mt-0.5 text-xs ui-text-muted">
                      {event.lokasyon} · {event.tarih}
                    </p>
                    <p className="mt-1 text-xs font-medium ui-text-muted">{event.atananRol}</p>
                    <p className="mt-0.5 text-xs ui-text-muted">{event.operasyonOzeti}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${EVENT_STATUS_STYLES[event.durum]}`}
                  >
                    {EVENT_STATUS_LABELS[event.durum]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* D: İlişkili Belgeler — lower section */}
      <SectionCard title="İlişkili Belgeler">
        <ul className="space-y-2" role="list">
          {data.relatedDocuments.map((doc) => (
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
                  <span>{doc.boyutVersiyon}</span>
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
