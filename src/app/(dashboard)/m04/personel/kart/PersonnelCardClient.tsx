"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import PageHeader from "@/components/shell/PageHeader";
import { useToast } from "@/components/ui/ToastProvider";
import {
  fetchPersonnel,
  fetchPersonnelById,
  fetchPersonnelEventAssignments,
  fetchReportsToPersonnel,
  fetchLinkedUsers,
  fetchUsersForLinking,
  linkPersonnelToUser,
  getFullName,
} from "@/lib/m04/personnel";
import type { PersonnelRecord, PersonnelEventAssignment } from "@/lib/m04/personnel";

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

const STATUS_LABELS: Record<string, string> = {
  active: "Aktif",
  inactive: "Pasif",
  on_leave: "İzinli",
  blacklist: "Kara Liste",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-200",
  inactive: "bg-slate-500/20 text-slate-400",
  on_leave: "bg-amber-500/20 text-amber-200",
  blacklist: "bg-red-500/20 text-red-300",
};

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6 backdrop-blur-sm ${className}`}>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider ui-text-muted">{title}</h3>
      {children}
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

type TabId = "general" | "tasks" | "performance" | "permissions" | "notes" | "activity";

const TABS: { id: TabId; label: string }[] = [
  { id: "general", label: "Genel Bilgi" },
  { id: "tasks", label: "Görevler" },
  { id: "performance", label: "Performans" },
  { id: "permissions", label: "Yetkiler" },
  { id: "notes", label: "Notlar" },
  { id: "activity", label: "Aktivite" },
];

function TabContent({
  record,
  reportsTo,
  linkedUser,
  eventAssignments,
  activeTab,
  onUnlink,
  linkSaving,
}: {
  record: PersonnelRecord;
  reportsTo: PersonnelRecord | null;
  linkedUser: { email: string | null; full_name: string | null; is_active: boolean; role_key: string | null } | null;
  eventAssignments: PersonnelEventAssignment[];
  activeTab: TabId;
  onUnlink?: () => void;
  linkSaving?: boolean;
}) {
  const fullName = getFullName(record);
  const statusKey = record.status ?? "active";

  if (activeTab === "general") {
    return (
      <div className="space-y-4">
        <InfoRow label="Departman" value={record.org_units?.name ?? "—"} />
        <InfoRow label="Unvan" value={record.job_titles?.name ?? "—"} />
        <InfoRow label="Uyruk" value={record.nationality ?? "—"} />
        <InfoRow label="İşe Başlama" value={formatDate(record.hire_date)} />
        <InfoRow label="RBAC Rol" value={linkedUser?.role_key ?? record.rbac_role ?? "—"} />
        <InfoRow
          label="Durum"
          value={
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[statusKey] ?? STATUS_STYLES.inactive}`}>
              {STATUS_LABELS[statusKey] ?? statusKey}
            </span>
          }
        />
      </div>
    );
  }

  if (activeTab === "tasks") {
    return (
      <div className="space-y-6">
        <div>
          <p className="mb-2 text-xs font-medium ui-text-muted">Açık Görevler</p>
          <p className="text-sm ui-text-muted">Henüz görev atanmamış.</p>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium ui-text-muted">Event Atamaları</p>
          {eventAssignments.length === 0 ? (
            <p className="text-sm ui-text-muted">Henüz event ataması yok.</p>
          ) : (
            <ul className="space-y-2">
              {eventAssignments.map((ea) => {
                const ev = ea.etkinlik_events as { name?: string; date?: string } | null | undefined;
                const roleName = ea.job_titles?.name ?? ea.assignment_type ?? "—";
                const endDate = ea.end_date ? new Date(ea.end_date) : null;
                const isActive = !endDate || endDate >= new Date();
                return (
                  <li key={ea.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/30 p-3 text-sm">
                    <p className="font-medium text-[var(--color-text)]">{ev?.name ?? "Event"}</p>
                    <p className="mt-1 text-xs ui-text-muted">
                      {roleName} • {formatDate(ea.start_date)} – {formatDate(ea.end_date)}
                    </p>
                    <span className={`mt-2 inline-block rounded px-2 py-0.5 text-xs ${isActive ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-500/20 text-slate-400"}`}>
                      {isActive ? "Aktif" : "Tamamlandı"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  }

  if (activeTab === "performance") {
    return (
      <div className="space-y-6">
        <InfoRow label="Yönetici Notu" value={record.notes ? "Var" : "—"} />
        <div>
          <p className="mb-2 text-xs font-medium ui-text-muted">Güçlü Yönler</p>
          <p className="text-sm ui-text-muted">—</p>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium ui-text-muted">Gelişim Alanları</p>
          <p className="text-sm ui-text-muted">—</p>
        </div>
        <InfoRow label="Son Değerlendirme" value="—" />
      </div>
    );
  }

  if (activeTab === "permissions") {
    return (
      <div className="space-y-6">
        <InfoRow label="Mevcut Rol" value={linkedUser?.role_key ?? record.rbac_role ?? "—"} />
        <InfoRow label="Sistem Hesabı" value={linkedUser ? (linkedUser.email ?? "Bağlı") : "Bağlı Değil"} />
        {linkedUser && onUnlink && (
          <button
            type="button"
            onClick={onUnlink}
            disabled={linkSaving}
            className="rounded border border-[var(--color-border)] px-2 py-1 text-xs font-medium ui-text-muted hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
          >
            Bağlantıyı Kaldır
          </button>
        )}
        <div>
          <p className="mb-2 text-xs font-medium ui-text-muted">Yetki Grupları</p>
          <ul className="space-y-1 text-sm">
            <li className="rounded px-2 py-1 bg-[var(--color-surface2)]/50">personnel.view</li>
            <li className="rounded px-2 py-1 bg-[var(--color-surface2)]/50">personnel.manage</li>
          </ul>
        </div>
      </div>
    );
  }

  if (activeTab === "notes") {
    return (
      <div className="space-y-4">
        <p className="text-sm ui-text-muted">{record.notes ?? "Not yok."}</p>
      </div>
    );
  }

  if (activeTab === "activity") {
    return (
      <div className="space-y-4">
        <p className="mb-2 text-xs font-medium ui-text-muted">Atama Geçmişi</p>
        {eventAssignments.length === 0 ? (
          <p className="text-sm ui-text-muted">—</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {eventAssignments.map((ea) => {
              const ev = ea.etkinlik_events as { name?: string } | null | undefined;
              return (
                <li key={ea.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/20 px-3 py-2">
                  {ev?.name ?? "Event"} • {formatDate(ea.start_date)}
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-4 text-xs ui-text-muted">İşlem geçmişi entegrasyonu planlanıyor.</p>
      </div>
    );
  }

  return null;
}

export default function PersonnelCardClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");
  const toast = useToast();
  const [staffList, setStaffList] = useState<PersonnelRecord[]>([]);
  const [staffSearch, setStaffSearch] = useState("");
  const [record, setRecord] = useState<PersonnelRecord | null>(null);
  const [eventAssignments, setEventAssignments] = useState<PersonnelEventAssignment[]>([]);
  const [reportsTo, setReportsTo] = useState<PersonnelRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkedUser, setLinkedUser] = useState<{ email: string | null; full_name: string | null; is_active: boolean; role_key: string | null } | null>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUsers, setLinkUsers] = useState<Array<{ id: string; email: string | null; full_name: string | null }>>([]);
  const [selectedLinkUserId, setSelectedLinkUserId] = useState("");
  const [linkSaving, setLinkSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("general");

  const filteredStaff = useMemo(() => {
    if (!staffSearch.trim()) return staffList;
    const q = staffSearch.trim().toLowerCase();
    return staffList.filter(
      (r) =>
        getFullName(r).toLowerCase().includes(q) ||
        (r.email?.toLowerCase().includes(q) ?? false) ||
        (r.org_units?.name?.toLowerCase().includes(q) ?? false)
    );
  }, [staffList, staffSearch]);

  const loadStaffList = useCallback(async () => {
    try {
      const result = await fetchPersonnel({ status: "all", pageSize: 200 });
      setStaffList(result.data);
    } catch {
      setStaffList([]);
    }
  }, []);

  const loadPerson = useCallback(
    async (personId: string) => {
      setLoading(true);
      try {
        const [data, events] = await Promise.all([
          fetchPersonnelById(personId),
          fetchPersonnelEventAssignments(personId).catch(() => []),
        ]);
        setRecord(data);
        setEventAssignments(events);
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
        toast.error("Hata", err instanceof Error ? err.message : "Personel kaydı yüklenemedi.");
        setRecord(null);
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    loadStaffList();
  }, [loadStaffList]);

  useEffect(() => {
    if (id) {
      loadPerson(id);
    } else {
      setRecord(null);
      setEventAssignments([]);
      setReportsTo(null);
      setLinkedUser(null);
      setLoading(false);
    }
  }, [id, loadPerson]);

  const selectPerson = (personId: string) => {
    router.replace(`/m04/personel/kart?id=${personId}`, { scroll: false });
  };

  const statusKey = record?.status ?? "active";

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader title="360° Personel Kartı" subtitle="Personel seçin ve detayları görüntüleyin.">
        <Link href="/m04/personel" className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]">
          Listeye Dön
        </Link>
      </PageHeader>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left panel: searchable staff list */}
        <div className="ui-glass w-full shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm lg:w-72">
          <div className="border-b border-[var(--color-border)] p-3">
            <input
              type="text"
              placeholder="Personel ara..."
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
              className="ui-input w-full py-2 text-sm"
            />
          </div>
          <div className="max-h-[400px] overflow-y-auto lg:max-h-[calc(100vh-280px)]">
            {filteredStaff.length === 0 ? (
              <div className="p-4 text-center text-sm ui-text-muted">
                {staffList.length === 0 ? "Personel listesi yükleniyor…" : "Sonuç bulunamadı."}
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {filteredStaff.map((person) => {
                  const isSelected = person.id === id;
                  return (
                    <li key={person.id}>
                      <button
                        type="button"
                        onClick={() => selectPerson(person.id)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                          isSelected
                            ? "bg-[var(--color-primary)]/20 ring-1 ring-[var(--color-primary)]/50"
                            : "hover:bg-[var(--color-surface-hover)]/50"
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                            isSelected ? "bg-[var(--color-primary)]/30 text-[var(--color-text)]" : "bg-[var(--color-surface2)] ui-text-secondary"
                          }`}
                        >
                          {getInitials(person)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm font-medium ${isSelected ? "text-[var(--color-text)]" : "ui-text-secondary"}`}>
                            {getFullName(person)}
                          </p>
                          <p className="truncate text-xs ui-text-muted">{person.org_units?.name ?? "—"}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Main panel */}
        <div className="min-w-0 flex-1">
          {!id ? (
            <div className="ui-glass flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-12 backdrop-blur-sm">
              <p className="text-sm ui-text-muted">Soldan bir personel seçin veya Personel Listesinden tıklayın.</p>
              <Link href="/m04/personel" className="mt-4 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90">
                Personel Listesine Git
              </Link>
            </div>
          ) : loading ? (
            <div className="ui-glass flex items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 py-24 backdrop-blur-sm">
              <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-surface2)]" />
            </div>
          ) : !record ? (
            <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 backdrop-blur-sm">
              <p className="text-sm ui-text-muted">Kayıt bulunamadı.</p>
              <Link href="/m04/personel" className="mt-4 inline-block rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90">
                Listeye Dön
              </Link>
            </div>
          ) : (
            <>
              {/* Person profile header */}
              <div className="ui-glass mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6 backdrop-blur-sm">
                <div className="flex flex-wrap items-start gap-6">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface2)] text-2xl font-medium text-[var(--color-text)]">
                    {getInitials(record)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-semibold text-[var(--color-text)]">{getFullName(record)}</h2>
                    <p className="text-sm ui-text-muted">{record.job_titles?.name ?? "—"}</p>
                    <p className="text-xs ui-text-muted">{record.org_units?.name ?? "—"}</p>
                    <span className={`mt-2 inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[statusKey] ?? STATUS_STYLES.inactive}`}>
                      {STATUS_LABELS[statusKey] ?? statusKey}
                    </span>
                    <p className="mt-2 text-xs ui-text-muted">RBAC: {linkedUser?.role_key ?? record.rbac_role ?? "—"}</p>
                    <p className="text-xs ui-text-muted">{record.email ?? "—"}</p>
                    <p className="text-xs ui-text-muted">{record.phone ?? "—"}</p>
                    <p className="text-xs ui-text-muted">Uyruk: {record.nationality ?? "—"}</p>
                    <p className="text-xs ui-text-muted">İşe başlama: {formatDate(record.hire_date)}</p>
                    {record.notes && (
                      <p className="mt-2 line-clamp-2 text-xs ui-text-muted">{record.notes}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const users = await fetchUsersForLinking();
                          setLinkUsers(users);
                          setSelectedLinkUserId("");
                          setLinkModalOpen(true);
                        } catch {
                          toast.error("Hata", "Kullanıcı listesi yüklenemedi.");
                        }
                      }}
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-3 py-1.5 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
                    >
                      Rol Ata
                    </button>
                  </div>
                </div>
              </div>

              {/* KPI cards */}
              <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 backdrop-blur-sm">
                  <p className="text-xs font-medium ui-text-muted">Aktif Görev</p>
                  <p className="mt-1 text-xl font-bold text-[var(--color-text)]">0</p>
                </div>
                <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 backdrop-blur-sm">
                  <p className="text-xs font-medium ui-text-muted">Tamamlanan Görev</p>
                  <p className="mt-1 text-xl font-bold text-[var(--color-text)]">0</p>
                </div>
                <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 backdrop-blur-sm">
                  <p className="text-xs font-medium ui-text-muted">Atandığı Event</p>
                  <p className="mt-1 text-xl font-bold text-[var(--color-text)]">{eventAssignments.length}</p>
                </div>
                <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 backdrop-blur-sm">
                  <p className="text-xs font-medium ui-text-muted">Bekleyen Onay</p>
                  <p className="mt-1 text-xl font-bold text-[var(--color-text)]">0</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-1 border-b border-[var(--color-border)]">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
                        activeTab === tab.id
                          ? "border-b-2 border-[var(--color-primary)] bg-[var(--color-surface2)]/50 text-[var(--color-text)]"
                          : "ui-text-muted hover:bg-[var(--color-surface-hover)]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <Card title={TABS.find((t) => t.id === activeTab)?.label ?? ""}>
                  <TabContent
                    record={record}
                    reportsTo={reportsTo}
                    linkedUser={linkedUser}
                    eventAssignments={eventAssignments}
                    activeTab={activeTab}
                    onUnlink={async () => {
                      setLinkSaving(true);
                      try {
                        await linkPersonnelToUser(record.id, null);
                        setLinkedUser(null);
                        toast.success("Bağlantı Kaldırıldı", "Personel kaydı sistem hesabından ayrıldı.");
                      } catch (err) {
                        toast.error("Hata", err instanceof Error ? err.message : "Bağlantı kaldırılamadı.");
                      } finally {
                        setLinkSaving(false);
                      }
                    }}
                    linkSaving={linkSaving}
                  />
                </Card>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Link modal */}
      {linkModalOpen && record && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="ui-glass max-h-[80vh] w-full max-w-md overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 backdrop-blur-sm">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider ui-text-muted">Sistem Kullanıcısına Bağla</h3>
            <select
              value={selectedLinkUserId}
              onChange={(e) => setSelectedLinkUserId(e.target.value)}
              className="ui-input mb-4 w-full py-2 text-sm"
            >
              <option value="">— Kullanıcı seçin —</option>
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
                    toast.success("Bağlandı", "Personel kaydı sistem hesabına bağlandı.");
                  } catch (err) {
                    toast.error("Hata", err instanceof Error ? err.message : "Bağlanamadı.");
                  } finally {
                    setLinkSaving(false);
                  }
                }}
                disabled={!selectedLinkUserId || linkSaving}
                className="ui-button-primary rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                Bağla
              </button>
              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
