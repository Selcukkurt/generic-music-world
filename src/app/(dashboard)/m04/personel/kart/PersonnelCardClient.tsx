"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/shell/PageHeader";
import { useToast } from "@/components/ui/ToastProvider";
import {
  fetchPersonnelById,
  fetchPersonnelEventAssignments,
  fetchPersonnelDocuments,
  fetchReportsToPersonnel,
  getFullName,
} from "@/lib/m04/personnel";
import type { PersonnelRecord, PersonnelEventAssignment, PersonnelDocument } from "@/lib/m04/personnel";

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(s: string | null | undefined): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("tr-TR");
  } catch {
    return s;
  }
}

function getInitials(record: PersonnelRecord): string {
  const full = getFullName(record);
  if (full && full !== "—") {
    const parts = full.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return full.slice(0, 2).toUpperCase();
  }
  if (record.email) return record.email.slice(0, 2).toUpperCase();
  return "?";
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6 backdrop-blur-sm">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider ui-text-muted">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="ui-text-muted shrink-0">{label}</span>
      <span className="text-right text-[var(--color-text)]">{value ?? "—"}</span>
    </div>
  );
}

export default function PersonnelCardClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const toast = useToast();
  const [record, setRecord] = useState<PersonnelRecord | null>(null);
  const [eventAssignments, setEventAssignments] = useState<PersonnelEventAssignment[]>([]);
  const [documents, setDocuments] = useState<PersonnelDocument[]>([]);
  const [reportsTo, setReportsTo] = useState<PersonnelRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [data, events, docs] = await Promise.all([
        fetchPersonnelById(id),
        fetchPersonnelEventAssignments(id).catch(() => []),
        fetchPersonnelDocuments(id).catch(() => []),
      ]);
      setRecord(data);
      setEventAssignments(events);
      setDocuments(docs);
      if (data?.reports_to_person_id) {
        const r = await fetchReportsToPersonnel(data.reports_to_person_id);
        setReportsTo(r);
      } else {
        setReportsTo(null);
      }
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Personel kaydı yüklenemedi.");
      setRecord(null);
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (!id) {
    return (
      <div className="flex w-full flex-col gap-6">
        <PageHeader title="360° Personel Kartı" subtitle="Personel seçin veya listeden tıklayın." />
        <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 backdrop-blur-sm">
          <p className="text-sm ui-text-secondary">Personel kartı görüntülemek için Personel Listesinden bir kayıt seçin.</p>
          <Link
            href="/m04/personel"
            className="mt-4 inline-flex rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Personel Listesine Git
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex w-full flex-col gap-6">
        <PageHeader title="360° Personel Kartı" subtitle="Yükleniyor…" />
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-surface2)]" />
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex w-full flex-col gap-6">
        <PageHeader title="360° Personel Kartı" subtitle="Kayıt bulunamadı." />
        <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 backdrop-blur-sm">
          <p className="text-sm ui-text-secondary">Belirtilen personel kaydı bulunamadı.</p>
          <Link
            href="/m04/personel"
            className="mt-4 inline-flex rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Personel Listesine Dön
          </Link>
        </div>
      </div>
    );
  }

  const fullName = getFullName(record);
  const statusLabels: Record<string, string> = { active: "Aktif", inactive: "Pasif", blacklist: "Kara Liste" };
  const statusStyles: Record<string, string> = {
    active: "bg-emerald-500/20 text-emerald-200",
    inactive: "bg-slate-500/20 text-slate-400",
    blacklist: "bg-red-500/20 text-red-300",
  };
  const docList = Array.isArray(record.documents) ? record.documents : [];
  const hasDocs = docList.length > 0 || documents.length > 0;

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title={fullName}
        subtitle={`360° Personel Kartı • ${record.job_titles?.name ?? "—"}`}
      >
        <Link
          href="/m04/personel"
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
        >
          Listeye Dön
        </Link>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Genel Bilgiler">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface2)] text-xl font-medium text-[var(--color-text)]">
              {getInitials(record)}
            </div>
            <div>
              <p className="font-semibold text-[var(--color-text)]">{fullName}</p>
              <p className="text-sm ui-text-muted">{record.email ?? "—"}</p>
            </div>
          </div>
          <InfoRow label="Ad Soyad" value={fullName} />
          <InfoRow label="TC Kimlik No" value={record.national_id} />
          <InfoRow label="Telefon" value={record.phone} />
          <InfoRow label="E-posta" value={record.email} />
        </SectionCard>

        <SectionCard title="İK Bilgileri">
          <InfoRow label="Sigorta Durumu" value={record.insurance_status === "insured" ? "Sigortalı" : "Freelance"} />
          <InfoRow label="Maaş Tipi" value={record.salary_type === "monthly" ? "Aylık" : record.salary_type === "daily" ? "Günlük" : "Freelance"} />
          <InfoRow label="Maaş Tutarı" value={formatCurrency(record.salary_amount ?? record.salary_monthly ?? record.daily_rate)} />
          <InfoRow label="IBAN" value={record.iban ? `${record.iban.slice(0, 4)}****${record.iban.slice(-4)}` : null} />
          <InfoRow
            label="Durum"
            value={
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusStyles[record.status ?? "active"] ?? statusStyles.inactive}`}>
                {statusLabels[record.status ?? "active"] ?? record.status}
              </span>
            }
          />
        </SectionCard>

        <SectionCard title="Organizasyon & Rol">
          <InfoRow label="Unvan" value={record.job_titles?.name} />
          <InfoRow label="RBAC Rolü" value={record.rbac_role} />
          <InfoRow label="Organizasyon Birimi" value={record.org_units?.name} />
          <InfoRow
            label="Rapor Veren"
            value={reportsTo ? getFullName(reportsTo) : "—"}
          />
        </SectionCard>

        <SectionCard title="Etkinlik Geçmişi">
          {eventAssignments.length === 0 ? (
            <p className="text-sm ui-text-muted">Henüz atanmış etkinlik yok.</p>
          ) : (
            <ul className="space-y-2">
              {eventAssignments.slice(0, 10).map((ea) => {
                const ev = ea.etkinlik_events as { name?: string; date?: string } | null | undefined;
                return (
                  <li key={ea.id} className="flex justify-between gap-2 text-sm">
                    <span className="ui-text-secondary">{ev?.name ?? "Etkinlik"}</span>
                    <span className="text-xs ui-text-muted">
                      {ea.assignment_type} • {formatDate(ev?.date ?? ea.start_date ?? ea.end_date)}
                    </span>
                  </li>
                );
              })}
              {eventAssignments.length > 10 && (
                <li className="text-xs ui-text-muted">+{eventAssignments.length - 10} daha</li>
              )}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Performans & Feedback">
          <InfoRow label="Ortalama Puan" value="—" />
          <InfoRow label="Etkinlik Puanları" value="—" />
          <InfoRow label="Yönetici Notları" value={record.notes ? "Var" : "—"} />
          <p className="text-xs ui-text-muted">Detaylı feedback M03 entegrasyonu ile eklenecek.</p>
        </SectionCard>

        <SectionCard title="Belgeler">
          {hasDocs ? (
            <ul className="space-y-1 text-sm">
              {documents.map((d) => (
                <li key={d.id} className="ui-text-secondary">
                  {d.name}
                  {d.file_url && (
                    <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs text-[var(--color-primary)] hover:underline">
                      Görüntüle
                    </a>
                  )}
                </li>
              ))}
              {(docList as Array<{ name?: string }>).map((d, i) => (
                <li key={`legacy-${i}`} className="ui-text-secondary">{d.name ?? `Belge ${i + 1}`}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm ui-text-muted">Belge yok.</p>
          )}
        </SectionCard>

        <SectionCard title="Hak Ediş Özeti">
          <InfoRow label="Tahmini Ödeme" value={formatCurrency(record.salary_amount ?? record.salary_monthly ?? record.daily_rate)} />
          <InfoRow label="Tip" value={record.salary_type === "monthly" ? "Aylık" : record.salary_type === "daily" ? "Günlük" : "Freelance"} />
          <p className="mt-2 text-xs ui-text-muted">Detaylı bordro özeti M03 entegrasyonu ile eklenecek.</p>
        </SectionCard>

        <SectionCard title="Risk / Kara Liste Notları">
          {record.status === "blacklist" && (
            <span className="mb-2 inline-flex rounded bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-300">
              Kara Liste
            </span>
          )}
          {record.notes ? (
            <p className={`text-sm ${record.status === "blacklist" ? "text-amber-200" : "ui-text-secondary"}`}>{record.notes}</p>
          ) : (
            <p className="text-sm ui-text-muted">Not yok.</p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
