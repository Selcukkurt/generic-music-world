"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/shell/PageHeader";
import { useToast } from "@/components/ui/ToastProvider";
import { fetchPersonnel, fetchLinkedUsers, getFullName } from "@/lib/m04/personnel";
import { fetchOrgUnits } from "@/lib/org-structure/data";
import type { PersonnelRecord } from "@/lib/m04/personnel";
import type { OrgUnit } from "@/lib/org-structure/types";

function getInitials(record: PersonnelRecord): string {
  const full = getFullName(record);
  if (full && full !== "—") {
    const parts = full.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return full.slice(0, 2).toUpperCase();
  }
  if (record.email) return record.email.slice(0, 2).toUpperCase();
  return "?";
}

const STATUS_LABELS: Record<string, string> = {
  active: "Aktif",
  inactive: "Pasif",
  on_leave: "İzinde",
  blacklist: "Kara Liste",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-200",
  inactive: "bg-slate-500/20 text-slate-400",
  on_leave: "bg-amber-500/20 text-amber-200",
  blacklist: "bg-red-500/20 text-red-300",
};

function StatusBadge({ record }: { record: PersonnelRecord }) {
  const s = record.status ?? (record.is_active ? "active" : "inactive");
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[s] ?? STATUS_STYLES.inactive}`}>
      {STATUS_LABELS[s] ?? s}
    </span>
  );
}

type ViewMode = "table" | "cards";

export default function M04PersonnelListClient() {
  const router = useRouter();
  const toast = useToast();
  const [list, setList] = useState<PersonnelRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "on_leave" | "all">("active");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [summaryCounts, setSummaryCounts] = useState({ toplam: 0, aktif: 0, pasif: 0, izinde: 0 });
  const [linkedMap, setLinkedMap] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [result, countsResult] = await Promise.all([
        fetchPersonnel({
          search: appliedSearch.trim() || undefined,
          status: statusFilter,
          org_unit_id: departmentFilter || undefined,
          page,
          pageSize,
        }),
        Promise.all([
          fetchPersonnel({ status: "all", pageSize: 1 }),
          fetchPersonnel({ status: "active", pageSize: 1 }),
          fetchPersonnel({ status: "inactive", pageSize: 1 }),
          fetchPersonnel({ status: "on_leave", pageSize: 1 }),
        ]),
      ]);
      setList(result.data);
      setTotal(result.total);
      setSummaryCounts({
        toplam: countsResult[0].total,
        aktif: countsResult[1].total,
        pasif: countsResult[2].total,
        izinde: countsResult[3].total,
      });
      const profileIds = result.data.map((r) => r.profile_id).filter((id): id is string => Boolean(id));
      if (profileIds.length > 0) {
        try {
          const linked = await fetchLinkedUsers(profileIds);
          const map: Record<string, boolean> = {};
          profileIds.forEach((pid) => {
            map[pid] = !!linked.get(pid);
          });
          setLinkedMap(map);
        } catch {
          setLinkedMap({});
        }
      } else {
        setLinkedMap({});
      }
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Personel listesi yüklenemedi.");
      setList([]);
      setTotal(0);
      setSummaryCounts({ toplam: 0, aktif: 0, pasif: 0, izinde: 0 });
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, departmentFilter, statusFilter, page, pageSize, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetchOrgUnits()
      .then(setOrgUnits)
      .catch(() => {});
  }, []);

  const totalPages = Math.ceil(total / pageSize);
  const openCard = (id: string) => router.push(`/hr/personnel/${id}`);

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Personel Listesi"
        subtitle="HR kayıtlarını görüntüleyin, filtreleyin ve yönetin."
      >
        <Link
          href="/m04/personel/yeni"
          className="ui-button-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
        >
          <span>+</span>
          <span>Yeni Personel</span>
        </Link>
      </PageHeader>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 backdrop-blur-sm">
          <p className="text-sm font-medium ui-text-muted">Toplam</p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-text)]">{summaryCounts.toplam}</p>
        </div>
        <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 backdrop-blur-sm">
          <p className="text-sm font-medium ui-text-muted">Aktif</p>
          <p className="mt-1 text-2xl font-bold text-emerald-200">{summaryCounts.aktif}</p>
        </div>
        <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 backdrop-blur-sm">
          <p className="text-sm font-medium ui-text-muted">Pasif</p>
          <p className="mt-1 text-2xl font-bold text-slate-400">{summaryCounts.pasif}</p>
        </div>
        <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 backdrop-blur-sm">
          <p className="text-sm font-medium ui-text-muted">İzinde</p>
          <p className="mt-1 text-2xl font-bold text-amber-200">{summaryCounts.izinde}</p>
        </div>
      </div>

      {/* Filter row */}
      <div className="ui-glass flex flex-wrap items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 backdrop-blur-sm">
        <input
          type="text"
          placeholder="İsim, e-posta, uyruk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), setAppliedSearch(search), setPage(1))}
          className="ui-input w-56 py-2 text-sm"
        />
        <select
          value={departmentFilter}
          onChange={(e) => {
            setDepartmentFilter(e.target.value);
            setPage(1);
          }}
          className="ui-input w-40 py-2 text-sm"
        >
          <option value="">Tüm Departmanlar</option>
          {orgUnits.map((ou) => (
            <option key={ou.id} value={ou.id}>
              {ou.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as typeof statusFilter);
            setPage(1);
          }}
          className="ui-input w-32 py-2 text-sm"
        >
          <option value="active">Aktif</option>
          <option value="inactive">Pasif</option>
          <option value="on_leave">İzinde</option>
          <option value="all">Tümü</option>
        </select>
        <button
          type="button"
          onClick={() => (setAppliedSearch(search), setPage(1))}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
        >
          Filtrele
        </button>
        <div className="ml-auto flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              viewMode === "table"
                ? "bg-[var(--color-surface-hover)] text-[var(--color-text)]"
                : "ui-text-muted hover:text-[var(--color-text)]"
            }`}
          >
            Tablo
          </button>
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              viewMode === "cards"
                ? "bg-[var(--color-surface-hover)] text-[var(--color-text)]"
                : "ui-text-muted hover:text-[var(--color-text)]"
            }`}
          >
            Kartlar
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden backdrop-blur-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-surface2)]" />
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16">
            <p className="text-sm font-medium text-[var(--color-text)]">
              {appliedSearch || departmentFilter || (statusFilter !== "all" && statusFilter !== "active")
                ? "Bu filtreler için sonuç bulunamadı."
                : "Henüz personel kaydı yok."}
            </p>
            <Link
              href="/m04/personel/yeni"
              className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
            >
              + Yeni Personel
            </Link>
          </div>
        ) : viewMode === "table" ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Personel</th>
                    <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Departman</th>
                    <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Unvan</th>
                    <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Durum</th>
                    <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Sistem Hesabı</th>
                    <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Çalışma Tipi</th>
                    <th className="px-4 py-3 text-right text-xs font-medium ui-text-muted w-24">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((record) => {
                    const isLinked = record.profile_id ? linkedMap[record.profile_id] : false;
                    return (
                      <tr
                        key={record.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => openCard(record.id)}
                        onKeyDown={(e) => e.key === "Enter" && openCard(record.id)}
                        className="cursor-pointer border-b border-[var(--color-border)] transition hover:bg-[var(--color-surface-hover)]/30"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface2)] text-sm font-medium ui-text-secondary">
                              {getInitials(record)}
                            </span>
                            <div className="min-w-0">
                              <p className="font-medium text-[var(--color-text)]">{getFullName(record)}</p>
                              <p className="truncate text-xs ui-text-muted">{record.email ?? "—"}</p>
                              <p className="mt-0.5 text-[10px] ui-text-muted">
                                {isLinked ? "Sistem hesabı bağlı" : "Bağlı değil"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm ui-text-secondary">
                          {record.org_units?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-sm ui-text-secondary">
                          {record.job_titles?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge record={record} />
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs ${isLinked ? "text-emerald-200" : "ui-text-muted"}`}>
                            {isLinked ? "Bağlı" : "Bağlı Değil"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm ui-text-secondary">
                          {record.insurance_status === "insured" ? "Sigortalı" : "Serbest"}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <Link
                            href={`/hr/personnel/${record.id}`}
                            className="rounded px-2 py-1 text-xs font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                          >
                            Görüntüle
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3">
                <p className="text-sm ui-text-muted">
                  {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} / {total}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded border border-[var(--color-border)] bg-[var(--color-surface2)] px-3 py-1.5 text-sm font-medium ui-text-secondary disabled:opacity-50 hover:bg-[var(--color-surface-hover)] disabled:hover:bg-[var(--color-surface2)]"
                  >
                    Önceki
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded border border-[var(--color-border)] bg-[var(--color-surface2)] px-3 py-1.5 text-sm font-medium ui-text-secondary disabled:opacity-50 hover:bg-[var(--color-surface-hover)] disabled:hover:bg-[var(--color-surface2)]"
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((record) => (
                <div
                  key={record.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openCard(record.id)}
                  onKeyDown={(e) => e.key === "Enter" && openCard(record.id)}
                  className="ui-glass flex cursor-pointer items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface2)]/50 p-4 transition hover:bg-[var(--color-surface-hover)]/30"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)] text-base font-medium ui-text-secondary">
                    {getInitials(record)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--color-text)]">{getFullName(record)}</p>
                    <p className="truncate text-xs ui-text-muted">{record.email ?? "—"}</p>
                    <p className="mt-1 text-xs ui-text-muted">
                      {record.org_units?.name ?? "—"} • {record.job_titles?.name ?? "—"}
                    </p>
                    <div className="mt-2">
                      <StatusBadge record={record} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3">
                <p className="text-sm ui-text-muted">
                  {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} / {total}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded border border-[var(--color-border)] bg-[var(--color-surface2)] px-3 py-1.5 text-sm font-medium ui-text-secondary disabled:opacity-50 hover:bg-[var(--color-surface-hover)] disabled:hover:bg-[var(--color-surface2)]"
                  >
                    Önceki
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded border border-[var(--color-border)] bg-[var(--color-surface2)] px-3 py-1.5 text-sm font-medium ui-text-secondary disabled:opacity-50 hover:bg-[var(--color-surface-hover)] disabled:hover:bg-[var(--color-surface2)]"
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
