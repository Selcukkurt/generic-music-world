"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/shell/PageHeader";
import { useToast } from "@/components/ui/ToastProvider";
import {
  fetchOrgUnits,
  fetchPersonAssignments,
} from "@/lib/org-structure/data";
import type { OrgUnit, PersonAssignmentWithDetails } from "@/lib/org-structure/types";
import { ROLE_LABELS } from "@/lib/personnel/types";

function buildOrgTree(units: OrgUnit[]): OrgUnit[] {
  const byId = new Map(units.map((u) => [u.id, u]));
  const roots: OrgUnit[] = [];
  for (const u of units) {
    if (!u.parent_id) roots.push(u);
  }
  roots.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  return roots;
}

function getAssignmentsByUnit(
  assignments: PersonAssignmentWithDetails[]
): Map<string, PersonAssignmentWithDetails[]> {
  const byUnit = new Map<string, PersonAssignmentWithDetails[]>();
  for (const a of assignments) {
    const key = a.org_unit_id;
    const list = byUnit.get(key) ?? [];
    list.push(a);
    byUnit.set(key, list);
  }
  for (const list of byUnit.values()) {
    list.sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      const ar = a.job_title?.rank_order ?? 0;
      const br = b.job_title?.rank_order ?? 0;
      return br - ar;
    });
  }
  return byUnit;
}

export default function OrgStructureClient() {
  const toast = useToast();
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [assignments, setAssignments] = useState<PersonAssignmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [units, assigns] = await Promise.all([
        fetchOrgUnits(),
        fetchPersonAssignments(),
      ]);
      setOrgUnits(units);
      setAssignments(assigns);
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Organizasyon yapısı yüklenemedi.");
      setOrgUnits([]);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const roots = buildOrgTree(orgUnits);
  const byUnit = getAssignmentsByUnit(assignments);

  if (loading) {
    return (
      <div className="flex w-full flex-col gap-6">
        <PageHeader
          title="Organizasyon Yapısı"
          subtitle="Organizasyon birimleri ve atamalar."
        />
        <div className="ui-glass flex min-h-[200px] items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm">
          <p className="ui-text-muted text-sm">Yükleniyor…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Organizasyon Yapısı"
        subtitle="Organizasyon birimleri, unvanlar ve atamalar. RBAC (sistem erişimi) /system/rbac sayfasında yönetilir."
      />
      <div className="flex flex-col gap-6">
        {roots.length === 0 ? (
          <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 backdrop-blur-sm">
            <p className="ui-text-muted text-center text-sm">
              Henüz organizasyon birimi tanımlanmamış.
            </p>
          </div>
        ) : (
          roots.map((unit) => (
            <OrgUnitCard
              key={unit.id}
              unit={unit}
              assignments={byUnit.get(unit.id) ?? []}
            />
          ))
        )}
      </div>
    </div>
  );
}

function OrgUnitCard({
  unit,
  assignments,
}: {
  unit: OrgUnit;
  assignments: PersonAssignmentWithDetails[];
}) {
  return (
    <div className="ui-glass overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm">
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-[var(--color-text)]">{unit.name}</h3>
          {unit.module_code && (
            <span className="rounded bg-[var(--color-surface2)] px-2 py-0.5 text-xs ui-text-muted">
              {unit.module_code}
            </span>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        {assignments.length === 0 ? (
          <div className="px-4 py-6">
            <p className="ui-text-muted text-center text-sm">Atama yok</p>
          </div>
        ) : (
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface2)]/50">
                <th className="px-4 py-2 text-left font-medium ui-text-secondary">Kişi</th>
                <th className="px-4 py-2 text-left font-medium ui-text-secondary">Unvan</th>
                <th className="px-4 py-2 text-left font-medium ui-text-secondary">Rapor veren</th>
                <th className="px-4 py-2 text-left font-medium ui-text-secondary">Giriş / RBAC</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-[var(--color-border)]/50 last:border-b-0"
                >
                  <td className="px-4 py-2">
                    <span className="font-medium text-[var(--color-text)]">
                      {a.person?.full_name ?? a.person?.email ?? a.person_id}
                    </span>
                    {a.is_primary && (
                      <span className="ml-2 rounded bg-[var(--brand-yellow)]/20 px-1.5 py-0.5 text-xs text-[var(--brand-yellow)]">
                        Birincil
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 ui-text-secondary">
                    {a.job_title?.name ?? "—"}
                  </td>
                  <td className="px-4 py-2 ui-text-secondary">
                    {a.reports_to?.full_name ?? a.reports_to?.email ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    {a.has_login ? (
                      <span className="rounded bg-[var(--color-surface2)] px-2 py-0.5 text-xs">
                        {a.rbac_role ? ROLE_LABELS[a.rbac_role as keyof typeof ROLE_LABELS] ?? a.rbac_role : "Giriş var"}
                      </span>
                    ) : (
                      <span className="ui-text-muted text-xs">Giriş yok</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
