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
  fetchLinkedUsers,
  fetchUsersForLinking,
  linkPersonnelToUser,
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
  const [linkedUser, setLinkedUser] = useState<{ email: string | null; full_name: string | null; is_active: boolean; role_key: string | null } | null>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUsers, setLinkUsers] = useState<Array<{ id: string; email: string | null; full_name: string | null }>>([]);
  const [selectedLinkUserId, setSelectedLinkUserId] = useState("");
  const [linkSaving, setLinkSaving] = useState(false);

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
      if (data?.profile_id) {
        try {
          const linked = await fetchLinkedUsers([data.profile_id]);
          const info = linked.get(data.profile_id);
          setLinkedUser(info ? { email: info.email, full_name: info.full_name, is_active: info.is_active, role_key: info.role_key ?? null } : null);
        } catch {
          setLinkedUser(null);
        }
      } else {
        setLinkedUser(null);
      }
      if (data?.reports_to_person_id) {
        const r = await fetchReportsToPersonnel(data.reports_to_person_id).catch(() => null);
        setReportsTo(r);
      } else {
        setReportsTo(null);
      }
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Personnel record could not be loaded.");
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
        <PageHeader title="360° Personnel Card" subtitle="Select a person or click from the list." />
        <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 backdrop-blur-sm">
          <p className="text-sm ui-text-secondary">Select a record from the Personnel List to view the 360° card.</p>
          <Link
            href="/m04/personel"
            className="mt-4 inline-flex rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Go to Personnel List
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex w-full flex-col gap-6">
        <PageHeader title="360° Personnel Card" subtitle="Loading…" />
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-surface2)]" />
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex w-full flex-col gap-6">
        <PageHeader title="360° Personnel Card" subtitle="Record not found." />
        <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 backdrop-blur-sm">
          <p className="text-sm ui-text-secondary">The specified personnel record was not found.</p>
          <Link
            href="/m04/personel"
            className="mt-4 inline-flex rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Back to Personnel List
          </Link>
        </div>
      </div>
    );
  }

  const fullName = getFullName(record);
  const statusLabels: Record<string, string> = { active: "Active", inactive: "Inactive", blacklist: "Blacklist" };
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
          Back to List
        </Link>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 1. Profile */}
        <SectionCard title="Profile">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface2)] text-xl font-medium text-[var(--color-text)]">
              {getInitials(record)}
            </div>
            <div>
              <p className="font-semibold text-[var(--color-text)]">{fullName}</p>
              <p className="text-sm ui-text-muted">{record.email ?? "—"}</p>
            </div>
          </div>
          <InfoRow label="Full Name" value={fullName} />
          <InfoRow label="Email" value={record.email} />
          <InfoRow label="Phone" value={record.phone} />
          <InfoRow label="National ID" value={record.national_id} />
          <InfoRow label="Nationality" value={record.nationality} />
          <InfoRow label="Insurance Status" value={record.insurance_status === "insured" ? "Insured" : "Freelance"} />
          <InfoRow
            label="Status"
            value={
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusStyles[record.status ?? "active"] ?? statusStyles.inactive}`}>
                {statusLabels[record.status ?? "active"] ?? record.status}
              </span>
            }
          />
        </SectionCard>

        {/* 2. Organizational Info */}
        <SectionCard title="Organizational Info">
          <InfoRow label="Job Title" value={record.job_titles?.name} />
          <InfoRow label="Org Unit" value={record.org_units?.name} />
          <InfoRow label="Manager" value={reportsTo ? getFullName(reportsTo) : "—"} />
          <InfoRow label="Hire Date" value={formatDate(record.hire_date)} />
        </SectionCard>

        {/* 3. System Access - linked via personnel.profile_id */}
        <SectionCard title="System Access">
          {linkedUser ? (
            <>
              <InfoRow label="Linked Account" value={linkedUser.email ?? linkedUser.full_name ?? "—"} />
              <InfoRow label="System Role" value={linkedUser.role_key ?? "—"} />
              <InfoRow
                label="Account Status"
                value={
                  <span
                    className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                      linkedUser.is_active ? "bg-emerald-500/20 text-emerald-200" : "bg-red-500/20 text-red-300"
                    }`}
                  >
                    {linkedUser.is_active ? "Active" : "Inactive"}
                  </span>
                }
              />
              <button
                type="button"
                onClick={async () => {
                  setLinkSaving(true);
                  try {
                    await linkPersonnelToUser(record.id, null);
                    setLinkedUser(null);
                    toast.success("Unlinked", "Personnel record unlinked from system account.");
                  } catch (err) {
                    toast.error("Error", err instanceof Error ? err.message : "Could not unlink.");
                  } finally {
                    setLinkSaving(false);
                  }
                }}
                disabled={linkSaving}
                className="mt-2 rounded border border-[var(--color-border)] p-2 text-xs font-medium ui-text-secondary hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
              >
                Unlink
              </button>
            </>
          ) : (
            <>
              <p className="text-sm ui-text-muted">No system account linked. Link this personnel record to a system user to grant access.</p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const users = await fetchUsersForLinking();
                    setLinkUsers(users);
                    setSelectedLinkUserId("");
                    setLinkModalOpen(true);
                  } catch {
                    toast.error("Error", "Could not load users for linking.");
                  }
                }}
                className="mt-2 rounded border border-[var(--color-border)] p-2 text-xs font-medium ui-text-secondary hover:bg-[var(--color-surface-hover)]"
              >
                Link to User
              </button>
            </>
          )}
        </SectionCard>

        {linkModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="ui-glass max-h-[80vh] w-full max-w-md overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 backdrop-blur-sm">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider ui-text-muted">Link to System User</h3>
              <select
                value={selectedLinkUserId}
                onChange={(e) => setSelectedLinkUserId(e.target.value)}
                className="ui-input mb-4 w-full py-2 text-sm"
              >
                <option value="">— Select user —</option>
                {linkUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email ?? u.full_name ?? u.id.slice(0, 8)}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedLinkUserId) return;
                    setLinkSaving(true);
                    try {
                      await linkPersonnelToUser(record.id, selectedLinkUserId);
                      const linked = await fetchLinkedUsers([selectedLinkUserId]);
                      const info = linked.get(selectedLinkUserId);
                      setLinkedUser(info ? { email: info.email, full_name: info.full_name, is_active: info.is_active, role_key: info.role_key ?? null } : null);
                      setLinkModalOpen(false);
                      toast.success("Linked", "Personnel record linked to system account.");
                    } catch (err) {
                      toast.error("Error", err instanceof Error ? err.message : "Could not link.");
                    } finally {
                      setLinkSaving(false);
                    }
                  }}
                  disabled={!selectedLinkUserId || linkSaving}
                  className="ui-button-primary rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  Link
                </button>
                <button
                  type="button"
                  onClick={() => setLinkModalOpen(false)}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary hover:bg-[var(--color-surface-hover)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. Event Assignments */}
        <SectionCard title="Event Assignments">
          {eventAssignments.length === 0 ? (
            <p className="text-sm ui-text-muted">No event assignments yet.</p>
          ) : (
            <ul className="space-y-3">
              {eventAssignments.map((ea) => {
                const ev = ea.etkinlik_events as { name?: string; date?: string; venue?: string | null } | null | undefined;
                const roleName = ea.job_titles?.name ?? ea.assignment_type ?? "—";
                const endDate = ea.end_date ? new Date(ea.end_date) : null;
                const derivedStatus = !endDate || endDate >= new Date() ? "Active" : "Completed";
                const assignmentStatus = ea.status ?? derivedStatus;
                const statusStyles: Record<string, string> = {
                  active: "bg-emerald-500/20 text-emerald-200",
                  completed: "bg-slate-500/20 text-slate-400",
                  cancelled: "bg-red-500/20 text-red-300",
                  Active: "bg-emerald-500/20 text-emerald-200",
                  Completed: "bg-slate-500/20 text-slate-400",
                };
                return (
                  <li key={ea.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 p-3 text-sm">
                    <div className="font-medium text-[var(--color-text)]">{ev?.name ?? "Event"}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ui-text-muted">
                      <span>Role: {roleName}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium capitalize ${statusStyles[assignmentStatus] ?? statusStyles.completed}`}
                      >
                        {assignmentStatus}
                      </span>
                      <span>
                        {formatDate(ea.start_date)} – {formatDate(ea.end_date)}
                      </span>
                    </div>
                  </li>
                );
              })}
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
