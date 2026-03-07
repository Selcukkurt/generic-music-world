"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import PageHeader from "@/components/shell/PageHeader";
import { useToast } from "@/components/ui/ToastProvider";
import {
  fetchOrgUnitsWithDetails,
  fetchPersonAssignments,
  buildOrgTreeFromUnits,
} from "@/lib/org-structure/data";
import type { OrgUnit, OrgUnitTreeNode } from "@/lib/org-structure/types";
import Link from "next/link";

function getPersonDisplay(a: { person?: { full_name?: string | null; email?: string | null } | null }): string {
  return a.person?.full_name ?? a.person?.email ?? "—";
}

export default function M04OrgTreeClient() {
  const toast = useToast();
  const [units, setUnits] = useState<OrgUnit[]>([]);
  const [assignments, setAssignments] = useState<Awaited<ReturnType<typeof fetchPersonAssignments>>>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [unitsData, assigns] = await Promise.all([
        fetchOrgUnitsWithDetails(),
        fetchPersonAssignments(),
      ]);
      setUnits(unitsData);
      setAssignments(assigns);
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Organizasyon yüklenemedi.");
      setUnits([]);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const tree = useMemo(() => buildOrgTreeFromUnits(units, assignments), [units, assignments]);

  const toggleExpand = (unitId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex w-full flex-col gap-6">
        <PageHeader title="Hiyerarşi Şeması" subtitle="Organizasyon birimleri ve atamalar." />
        <div className="ui-glass flex min-h-[300px] items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm">
          <p className="text-sm ui-text-muted">Yükleniyor…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Hiyerarşi Şeması"
        subtitle="Organizasyon birimleri ve atamalar. Org_units yapısına göre hiyerarşi."
      >
        <Link
          href="/m04/organizasyon/birimler"
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Birimleri Yönet
        </Link>
      </PageHeader>

      <div className="ui-glass min-h-[400px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6 backdrop-blur-sm">
        {tree.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface2)]">
              <svg className="h-8 w-8 ui-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="mb-3 text-base font-semibold text-[var(--color-text)]">Organizasyon verisi yok</h3>
            <p className="mb-4 max-w-sm text-sm ui-text-muted">
              Organizasyon birimleri ekleyerek hiyerarşiyi oluşturun.
            </p>
            <Link
              href="/m04/organizasyon/birimler"
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Birimleri Yönet
            </Link>
          </div>
        ) : (
          <OrgUnitTree nodes={tree} expanded={expanded} onToggleExpand={toggleExpand} />
        )}
      </div>
    </div>
  );
}

function OrgUnitTree({
  nodes,
  expanded,
  onToggleExpand,
}: {
  nodes: OrgUnitTreeNode[];
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
}) {
  return (
    <ul className="space-y-2">
      {nodes.map((node) => {
        const { unit, primaryAssignment, children } = node;
        const hasChildren = children.length > 0;
        const isExpanded = expanded.has(unit.id);

        return (
          <li key={unit.id} className="relative">
            <div className="flex items-start gap-2">
              {hasChildren && (
                <button
                  type="button"
                  onClick={() => onToggleExpand(unit.id)}
                  className="mt-3 flex h-5 w-5 shrink-0 items-center justify-center rounded ui-text-muted hover:bg-[var(--color-surface-hover)]"
                  aria-label={isExpanded ? "Daralt" : "Genişlet"}
                >
                  {isExpanded ? "−" : "+"}
                </button>
              )}
              {!hasChildren && <span className="w-5 shrink-0" />}
              <div className="ui-glass w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-3 backdrop-blur-sm">
                <div className="flex flex-col gap-1">
                  <p className="font-medium text-[var(--color-text)]">{unit.name}</p>
                  <p className="text-xs ui-text-secondary">
                    Unvan: {primaryAssignment?.job_title?.name ?? "—"}
                  </p>
                  <p className="text-xs ui-text-muted">
                    Atanan: {primaryAssignment ? getPersonDisplay(primaryAssignment) : "—"}
                  </p>
                  {unit.module_code && (
                    <span className="mt-1 inline-flex w-fit rounded bg-[var(--color-surface2)] px-1.5 py-0.5 text-[10px] ui-text-muted">
                      {unit.module_code}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {hasChildren && isExpanded && (
              <div className="ml-7 mt-2 border-l-2 border-[var(--color-border)] pl-4">
                <OrgUnitTree nodes={children} expanded={expanded} onToggleExpand={onToggleExpand} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
