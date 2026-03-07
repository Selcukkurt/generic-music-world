"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/shell/PageHeader";
import { useToast } from "@/components/ui/ToastProvider";
import { fetchPersonnel, getFullName } from "@/lib/m04/personnel";
import type { PersonnelRecord } from "@/lib/m04/personnel";

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

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

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
  const [insuranceFilter, setInsuranceFilter] = useState<"all" | "insured" | "freelance">("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchPersonnel({
        search: appliedSearch.trim() || undefined,
        insurance_status: insuranceFilter !== "all" ? insuranceFilter : undefined,
        status: statusFilter,
        page,
        pageSize,
      });
      setList(result.data);
      setTotal(result.total);
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Personnel list could not be loaded.");
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, insuranceFilter, statusFilter, page, pageSize, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / pageSize);
  const statusDisplay = (r: PersonnelRecord) => {
    const s = r.status ?? (r.is_active ? "active" : "inactive");
    const labels: Record<string, string> = { active: "Active", inactive: "Inactive", blacklist: "Blacklist" };
    const styles: Record<string, string> = {
      active: "bg-emerald-500/20 text-emerald-200",
      inactive: "bg-slate-500/20 text-slate-400",
      blacklist: "bg-red-500/20 text-red-300",
    };
    return (
      <span className={`rounded px-2 py-0.5 text-xs font-medium ${styles[s] ?? styles.inactive}`}>
        {labels[s] ?? s}
      </span>
    );
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Personnel List"
        subtitle="View, filter, and manage HR records. RBAC role, job title, and assignment are kept separate."
      >
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search name, email, national ID, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), setAppliedSearch(search), setPage(1))}
            className="ui-input w-56 py-2 text-sm"
          />
          <select
            value={insuranceFilter}
            onChange={(e) => {
              setInsuranceFilter(e.target.value as "all" | "insured" | "freelance");
              setPage(1);
            }}
            className="ui-input w-32 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="insured">Insured</option>
            <option value="freelance">Freelance</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "active" | "inactive" | "all");
              setPage(1);
            }}
            className="ui-input w-28 py-2 text-sm"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
          <button
            type="button"
            onClick={() => (setAppliedSearch(search), setPage(1))}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
          >
            Filter
          </button>
          <Link
            href="/m04/personel/yeni"
            className="ui-button-primary rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Add New Personnel
          </Link>
        </div>
      </PageHeader>

      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden backdrop-blur-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-surface2)]" />
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <p className="text-sm font-medium text-[var(--color-text)]">
              {appliedSearch || insuranceFilter !== "all" || statusFilter !== "active"
                ? "No results for these filters."
                : "No personnel records yet."}
            </p>
            <Link
              href="/m04/personel/yeni"
              className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
            >
              Add New Personnel
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Avatar</th>
                    <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Full Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">National ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Insurance</th>
                    <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Job Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">RBAC Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Org Unit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium ui-text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((record) => (
                    <tr
                      key={record.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push(`/m04/personel/kart?id=${record.id}`)}
                      onKeyDown={(e) => e.key === "Enter" && router.push(`/m04/personel/kart?id=${record.id}`)}
                      className="cursor-pointer border-b border-[var(--color-border)] transition hover:bg-[var(--color-surface-hover)]/30"
                    >
                      <td className="px-4 py-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface2)] text-xs font-medium ui-text-secondary">
                          {getInitials(record)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--color-text)]">{getFullName(record)}</p>
                      </td>
                      <td className="px-4 py-3 text-sm ui-text-secondary font-mono">
                        {record.national_id || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm ui-text-secondary">
                        {record.email || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm ui-text-secondary">
                        {record.phone || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${
                            record.insurance_status === "insured"
                              ? "bg-emerald-500/20 text-emerald-200"
                              : "bg-amber-500/20 text-amber-200"
                          }`}
                        >
                          {record.insurance_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm ui-text-secondary">
                        {record.job_titles?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm ui-text-secondary">
                        {record.rbac_role ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm ui-text-secondary">
                        {record.org_units?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">{statusDisplay(record)}</td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/m04/personel/kart?id=${record.id}`}
                          className="rounded px-2 py-1 text-xs font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3">
                <p className="text-sm ui-text-muted">
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded border border-[var(--color-border)] bg-[var(--color-surface2)] px-3 py-1.5 text-sm font-medium ui-text-secondary disabled:opacity-50 hover:bg-[var(--color-surface-hover)] disabled:hover:bg-[var(--color-surface2)]"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded border border-[var(--color-border)] bg-[var(--color-surface2)] px-3 py-1.5 text-sm font-medium ui-text-secondary disabled:opacity-50 hover:bg-[var(--color-surface-hover)] disabled:hover:bg-[var(--color-surface2)]"
                  >
                    Next
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
