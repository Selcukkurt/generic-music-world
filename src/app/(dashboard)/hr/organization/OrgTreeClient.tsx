"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import PageHeader from "@/components/shell/PageHeader";
import { useToast } from "@/components/ui/ToastProvider";
import {
  fetchOrgUnits,
  fetchPersonAssignments,
  buildOrgTree,
} from "@/lib/org-structure/data";
import type { OrgTreeNode, PersonAssignmentWithDetails } from "@/lib/org-structure/types";
import { ROLE_LABELS } from "@/lib/personnel/types";
import { fetchUserEventAccess } from "@/lib/rbac-v1/api";
import Link from "next/link";

/** Top-level directorates for department filter */
const DIRECTORATES = [
  { id: "executive", label: "Executive", match: ["GMW Executive", "Executive"] },
  { id: "events", label: "Events", match: ["Operations", "Events"] },
  { id: "finance", label: "Finance", match: ["Finance"] },
  { id: "marketing", label: "Marketing", match: ["Marketing"] },
  { id: "booking", label: "Booking", match: ["Booking", "Booking/Artist", "Artist"] },
  { id: "hr", label: "HR", match: ["HR", "HR/Organization", "Organization"] },
] as const;

function orgUnitMatchesDirectorate(orgUnitName: string | undefined, directorateId: string): boolean {
  if (!orgUnitName) return false;
  const d = DIRECTORATES.find((x) => x.id === directorateId);
  if (!d) return false;
  const lower = orgUnitName.toLowerCase();
  return d.match.some((m) => lower.includes(m.toLowerCase()));
}

function getInitials(a: PersonAssignmentWithDetails): string {
  const name = a.person?.full_name?.trim();
  if (name) {
    const parts = name.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (a.person?.email) return a.person.email.slice(0, 2).toUpperCase();
  return "?";
}

function matchesSearch(a: PersonAssignmentWithDetails, q: string): boolean {
  if (!q.trim()) return true;
  const lower = q.toLowerCase();
  const name = (a.person?.full_name ?? "").toLowerCase();
  const email = (a.person?.email ?? "").toLowerCase();
  const title = (a.job_title?.name ?? "").toLowerCase();
  const dept = (a.org_unit?.name ?? "").toLowerCase();
  return name.includes(lower) || email.includes(lower) || title.includes(lower) || dept.includes(lower);
}

function filterTree(nodes: OrgTreeNode[], search: string, deptFilter: string): OrgTreeNode[] {
  if (!search.trim() && !deptFilter) return nodes;
  return nodes
    .map((node) => {
      const match = matchesSearch(node.assignment, search);
      const deptMatch = !deptFilter || orgUnitMatchesDirectorate(node.assignment.org_unit?.name ?? "", deptFilter);
      const childMatch = filterTree(node.children, search, deptFilter).length > 0;
      const show = (match && deptMatch) || childMatch;
      if (!show) return null;
      return {
        ...node,
        children: filterTree(node.children, search, deptFilter),
      };
    })
    .filter((n): n is OrgTreeNode => n !== null);
}

export default function OrgTreeClient() {
  const toast = useToast();
  const [assignments, setAssignments] = useState<PersonAssignmentWithDetails[]>([]);
  const [orgUnits, setOrgUnits] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [selected, setSelected] = useState<PersonAssignmentWithDetails | null>(null);
  const [eventAccess, setEventAccess] = useState<Array<{ event_id: string; event?: { name: string; date: string } | null }>>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [units, assigns] = await Promise.all([
        fetchOrgUnits(),
        fetchPersonAssignments(),
      ]);
      setOrgUnits(units.map((u) => ({ id: u.id, name: u.name })));
      setAssignments(assigns);
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Organizasyon yüklenemedi.");
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selected) {
      setEventAccess([]);
      return;
    }
    fetchUserEventAccess(selected.person_id)
      .then((entries) => setEventAccess(entries))
      .catch(() => setEventAccess([]));
  }, [selected?.person_id]);

  const tree = useMemo(() => buildOrgTree(assignments), [assignments]);
  const filteredTree = useMemo(() => filterTree(tree, search, deptFilter), [tree, search, deptFilter]);

  const stats = useMemo(() => {
    const uniquePeople = new Set(assignments.map((a) => a.person_id));
    const uniqueDepts = new Set(assignments.map((a) => a.org_unit_id));
    const reportsToSet = new Set(assignments.map((a) => a.reports_to_person_id).filter(Boolean));
    const managers = reportsToSet.size;
    const assignedUnitIds = new Set(assignments.map((a) => a.org_unit_id));
    const openAssignments = orgUnits.filter((u) => !assignedUnitIds.has(u.id)).length;
    const ceo = assignments.find((a) => a.job_title?.name === "Founder/CEO" || a.job_title?.name === "CEO");
    const actingLabel = ceo?.person?.full_name
      ? `Acting: ${ceo.person.full_name} (${ceo.job_title?.name ?? "CEO"})`
      : ceo?.person?.email
        ? `Acting: ${ceo.person.email} (${ceo.job_title?.name ?? "CEO"})`
        : "Acting: Selcuk Kurt (CEO)";
    return {
      totalPeople: uniquePeople.size,
      departments: uniqueDepts.size,
      managers,
      openAssignments,
      actingLabel,
    };
  }, [assignments, orgUnits]);

  const directReports = useMemo(() => {
    if (!selected) return [];
    return assignments.filter((a) => a.reports_to_person_id === selected.person_id);
  }, [assignments, selected]);

  const toggleExpand = (personId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) next.delete(personId);
      else next.add(personId);
      return next;
    });
  };

  const isHighlighted = (a: PersonAssignmentWithDetails) =>
    Boolean(search.trim() && matchesSearch(a, search));

  const hasData = assignments.length > 0 || orgUnits.length > 0;

  if (loading) {
    return (
      <div className="flex w-full flex-col gap-6">
        <PageHeader title="Organizasyon Yapısı" subtitle="Şirket hiyerarşisi ve raporlama çizgileri." />
        <div className="ui-glass flex min-h-[300px] items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm">
          <p className="ui-text-muted text-sm">Yükleniyor…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Organizasyon Yapısı"
        subtitle="Şirket hiyerarşisi ve raporlama çizgileri."
      />

      {/* Summary stats */}
      <div className="ui-glass grid grid-cols-2 gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 backdrop-blur-sm sm:grid-cols-4">
        <div className="rounded-lg border border-[var(--color-border)]/50 bg-[var(--color-bg)]/30 px-4 py-3">
          <p className="text-2xl font-semibold text-[var(--color-text)]">{stats.totalPeople}</p>
          <p className="text-xs ui-text-muted">Toplam Kişi</p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)]/50 bg-[var(--color-bg)]/30 px-4 py-3">
          <p className="text-2xl font-semibold text-[var(--color-text)]">{stats.departments}</p>
          <p className="text-xs ui-text-muted">Departman</p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)]/50 bg-[var(--color-bg)]/30 px-4 py-3">
          <p className="text-2xl font-semibold text-[var(--color-text)]">{stats.managers}</p>
          <p className="text-xs ui-text-muted">Yönetici</p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)]/50 bg-[var(--color-bg)]/30 px-4 py-3">
          <p className="text-2xl font-semibold text-[var(--color-text)]">{stats.openAssignments}</p>
          <p className="text-xs ui-text-muted">Açık Atama</p>
          {stats.openAssignments > 0 && (
            <p className="mt-1 text-[10px] ui-text-muted italic">{stats.actingLabel}</p>
          )}
        </div>
      </div>

      {/* Top controls */}
      <div className="ui-glass flex flex-wrap items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 backdrop-blur-sm">
        <input
          type="search"
          placeholder="Ara (ad, e-posta, unvan, departman)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ui-input w-64 text-sm"
        />
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="ui-input w-40 text-sm"
        >
          <option value="">Tüm departmanlar</option>
          {DIRECTORATES.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
        <Link
          href="/dashboard/peopleops/users"
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Kişi ekle
        </Link>
        <Link
          href="/hr/assignments"
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
        >
          Atama düzenle
        </Link>
      </div>

      <div className="flex min-h-[500px] gap-6">
        {/* Tree */}
        <div className="min-w-0 flex-1 overflow-auto">
          <div className="ui-glass min-h-[400px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6 backdrop-blur-sm">
            {!hasData ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface2)]">
                  <svg className="h-8 w-8 ui-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="mb-3 text-base font-semibold text-[var(--color-text)]">Organizasyon verisi yok</h3>
                <p className="mb-4 max-w-sm text-sm ui-text-muted">
                  Organizasyon birimleri ve atamaları ekleyerek hiyerarşiyi oluşturun.</p>
                <Link
                  href="/hr/assignments"
                  className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Atamaları yönet
                </Link>
              </div>
            ) : filteredTree.length === 0 ? (
              <p className="py-12 text-center text-sm ui-text-muted">
                Arama veya filtreye uygun sonuç yok.
              </p>
            ) : (
              <OrgTree
                nodes={filteredTree}
                selected={selected}
                expanded={expanded}
                onSelect={setSelected}
                onToggleExpand={toggleExpand}
                isHighlighted={isHighlighted}
                getInitials={getInitials}
              />
            )}
          </div>
        </div>

        {/* Details panel */}
        <aside className="w-80 shrink-0">
          {selected ? (
            <div className="ui-glass sticky top-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 backdrop-blur-sm">
              <div className="mb-4 flex items-center gap-3">
                {selected.person?.avatar_url ? (
                  <img
                    src={selected.person.avatar_url}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface2)] text-sm font-medium text-[var(--color-text)]">
                    {getInitials(selected)}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-[var(--color-text)]">
                    {selected.person?.full_name ?? selected.person?.email ?? "—"}
                  </h3>
                  <p className="text-sm ui-text-muted">{selected.person?.email}</p>
                </div>
              </div>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="ui-text-muted">Sistem rolü</dt>
                  <dd>
                    {selected.rbac_role ? (
                      <span className="rounded bg-[var(--color-surface2)] px-2 py-0.5 text-xs">
                        {ROLE_LABELS[selected.rbac_role as keyof typeof ROLE_LABELS] ?? selected.rbac_role}
                      </span>
                    ) : (
                      <span className="ui-text-muted">Giriş yok</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="ui-text-muted">Unvan</dt>
                  <dd className="ui-text-secondary">{selected.job_title?.name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="ui-text-muted">Departman</dt>
                  <dd className="ui-text-secondary">{selected.org_unit?.name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="ui-text-muted">Rapor veren</dt>
                  <dd className="ui-text-secondary">{selected.reports_to?.full_name ?? selected.reports_to?.email ?? "—"}</dd>
                </div>
                <div>
                  <dt className="ui-text-muted">Doğrudan raporlar</dt>
                  <dd>
                    {directReports.length === 0 ? (
                      <span className="ui-text-muted">0</span>
                    ) : (
                      <ul className="mt-1 space-y-0.5">
                        {directReports.map((r) => (
                          <li key={r.id} className="text-xs ui-text-secondary">
                            {r.person?.full_name ?? r.person?.email}
                          </li>
                        ))}
                      </ul>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="ui-text-muted">Aktif etkinlikler</dt>
                  <dd>
                    {eventAccess.length === 0 ? (
                      <span className="ui-text-muted">0</span>
                    ) : (
                      <ul className="mt-1 space-y-0.5">
                        {eventAccess.slice(0, 5).map((e) => (
                          <li key={e.event_id} className="text-xs ui-text-secondary">
                            {(e.event as { name?: string })?.name ?? e.event_id.slice(0, 8)}…
                          </li>
                        ))}
                        {eventAccess.length > 5 && (
                          <li className="text-xs ui-text-muted">+{eventAccess.length - 5} daha</li>
                        )}
                      </ul>
                    )}
                  </dd>
                </div>
              </dl>
              <Link
                href="/hr/assignments"
                className="mt-4 block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] py-2 text-center text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
              >
                Atamayı düzenle
              </Link>
            </div>
          ) : (
            <div className="ui-glass flex min-h-[200px] items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 backdrop-blur-sm">
              <p className="ui-text-muted text-center text-sm">Detaylar için bir kişi seçin</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function OrgTree({
  nodes,
  selected,
  expanded,
  onSelect,
  onToggleExpand,
  isHighlighted,
  getInitials,
}: {
  nodes: OrgTreeNode[];
  selected: PersonAssignmentWithDetails | null;
  expanded: Set<string>;
  onSelect: (a: PersonAssignmentWithDetails) => void;
  onToggleExpand: (personId: string) => void;
  isHighlighted: (a: PersonAssignmentWithDetails) => boolean;
  getInitials: (a: PersonAssignmentWithDetails) => string;
}) {
  return (
    <ul className="space-y-2">
      {nodes.map((node) => {
        const a = node.assignment;
        const hasChildren = node.children.length > 0;
        const isExpanded = expanded.has(a.person_id);
        const highlighted = isHighlighted(a);
        const reportsCount = node.children.length;

        return (
          <li key={a.id} className="relative">
            <div className="flex items-start gap-2">
              {hasChildren && (
                <button
                  type="button"
                  onClick={() => onToggleExpand(a.person_id)}
                  className="mt-3 flex h-5 w-5 shrink-0 items-center justify-center rounded ui-text-muted hover:bg-[var(--color-surface-hover)]"
                  aria-label={isExpanded ? "Daralt" : "Genişlet"}
                >
                  {isExpanded ? "−" : "+"}
                </button>
              )}
              {!hasChildren && <span className="w-5 shrink-0" />}
              <button
                type="button"
                onClick={() => onSelect(a)}
                className={`ui-glass w-full rounded-xl border p-3 text-left transition backdrop-blur-sm ${
                  selected?.id === a.id
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                    : "border-[var(--color-border)] bg-[var(--color-surface)]/80 hover:border-[var(--color-border)]/80"
                } ${highlighted ? "ring-2 ring-[var(--brand-yellow)]/50" : ""}`}
              >
                <div className="flex items-center gap-3">
                  {a.person?.avatar_url ? (
                    <img
                      src={a.person.avatar_url}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface2)] text-sm font-medium text-[var(--color-text)]">
                      {getInitials(a)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--color-text)] truncate">
                      {a.person?.full_name ?? a.person?.email ?? "—"}
                    </p>
                    <p className="text-xs ui-text-secondary truncate">{a.job_title?.name ?? "—"}</p>
                    <p className="text-xs ui-text-muted truncate">{a.org_unit?.name ?? "—"}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {a.rbac_role && (
                        <span className="rounded bg-[var(--color-surface2)] px-1.5 py-0.5 text-[10px]">
                          {ROLE_LABELS[a.rbac_role as keyof typeof ROLE_LABELS] ?? a.rbac_role}
                        </span>
                      )}
                      {reportsCount > 0 && (
                        <span className="rounded bg-[var(--color-surface2)] px-1.5 py-0.5 text-[10px] ui-text-muted">
                          {reportsCount} rapor
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            </div>
            {hasChildren && isExpanded && (
              <div className="ml-7 mt-2 border-l-2 border-[var(--color-border)] pl-4">
                <OrgTree
                  nodes={node.children}
                  selected={selected}
                  expanded={expanded}
                  onSelect={onSelect}
                  onToggleExpand={onToggleExpand}
                  isHighlighted={isHighlighted}
                  getInitials={getInitials}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
