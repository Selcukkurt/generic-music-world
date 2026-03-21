/**
 * Maps raw DB results into Personnel360RealDataSlice.
 * Only maps fields supported by current schema; others are omitted (mock fallback).
 */

import { getFullName, type PersonnelRecord, type LinkedUserInfo } from "@/lib/m04/personnel";
import type { Personnel360RawData, Personnel360RealDataSlice } from "../types/personnel360.types";

function formatDateTR(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatTenure(hireDate: string | null | undefined): string {
  if (!hireDate) return "—";
  const start = new Date(hireDate);
  const now = new Date();
  if (Number.isNaN(start.getTime())) return "—";
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return `${years} yıl ${months} ay`;
}

function getInitials(record: PersonnelRecord): string {
  const full = getFullName(record);
  if (!full.trim()) return "—";
  const parts = full.trim().split(/\s+/);
  if (parts.length >= 2) {
    const first = parts[0]?.[0] ?? "";
    const last = parts[parts.length - 1]?.[0] ?? "";
    return (first + last).toUpperCase();
  }
  return (parts[0]?.slice(0, 2) ?? "—").toUpperCase();
}

const STATUS_LABELS: Record<string, string> = {
  active: "Aktif",
  inactive: "Pasif",
  on_leave: "İzinli",
  blacklist: "Kara Liste",
};

const STATUS_VARIANTS: Record<string, "active" | "inactive" | "warning"> = {
  active: "active",
  inactive: "inactive",
  on_leave: "warning",
  blacklist: "inactive",
};

/**
 * Transforms raw DB/query results into Personnel360RealDataSlice.
 */
export function mapRawToPersonnel360Slice(raw: Personnel360RawData): Personnel360RealDataSlice {
  const { personnel, manager, linkedUser } = raw;
  if (!personnel) return {};

  const fullName = getFullName(personnel);
  const jobTitle = personnel.job_titles?.name ?? null;
  const orgUnitName = personnel.org_units?.name ?? null;
  const managerName = manager ? getFullName(manager) : null;
  const status = personnel.status ?? "active";
  const statusLabel = STATUS_LABELS[status] ?? status;
  const statusVariant = STATUS_VARIANTS[status] ?? "active";

  return {
    header: {
      initials: getInitials(personnel),
      fullName: fullName || undefined,
      title: jobTitle ?? undefined,
      email: personnel.email ?? undefined,
      manager: managerName ?? undefined,
      status: statusLabel,
      statusVariant,
    },
    overview: {
      identity: {
        adSoyad: fullName || undefined,
        kurumsalEposta: personnel.email ?? undefined,
        unvan: jobTitle ?? undefined,
        departman: orgUnitName ?? undefined,
        yonetici: managerName ?? undefined,
        telefon: personnel.phone ?? undefined,
        iseGirisTarihi: personnel.hire_date ? formatDateTR(personnel.hire_date) : undefined,
        toplamKidem: personnel.hire_date ? formatTenure(personnel.hire_date) : undefined,
        sistemDurumu: statusLabel,
      },
      orgPosition: {
        rbacRolu: personnel.rbac_role ?? undefined,
        sistemHesabiDurumu: linkedUser
          ? linkedUser.is_active
            ? "Aktif"
            : "Pasif"
          : undefined,
      },
    },
    kpi: [{ label: "Yetki Seviyesi", value: personnel.rbac_role ?? "—" }],
  };
}
