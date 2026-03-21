/**
 * Personnel 360 real-data integration (Phase 1).
 * Read-only loader and mapper for header, overview identity, overview orgPosition (partial), and KPI (partial).
 * Uses existing schema: personnel, job_titles, org_units, profiles, user_roles, roles.
 */

import {
  fetchPersonnelById,
  fetchReportsToPersonnel,
  fetchLinkedUsers,
  getFullName,
  type PersonnelRecord,
  type LinkedUserInfo,
} from "@/lib/m04/personnel";
import type { PersonnelHeaderData } from "../components/PersonnelHeaderCard";
import type { OverviewIdentityData, OverviewOrgPositionData } from "../components/OverviewTabContent";

// ─── Raw / fetched data shape (DB results) ───────────────────────────────────

export type Personnel360RawData = {
  personnel: PersonnelRecord | null;
  manager: PersonnelRecord | null;
  linkedUser: LinkedUserInfo | null;
};

// ─── Partial real-data slice (what we can safely map from schema) ─────────────

export type Personnel360RealDataSlice = {
  header?: Partial<PersonnelHeaderData>;
  overview?: {
    identity?: Partial<OverviewIdentityData>;
    orgPosition?: Partial<OverviewOrgPositionData>;
  };
  /** KPI items to merge by label; only include labels we have real data for */
  kpi?: Array<{ label: string; value: string }>;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Loader ─────────────────────────────────────────────────────────────────

/**
 * Fetches real data for Personnel 360 Phase 1 slice.
 * Read-only; no mutations. Returns null if personnel not found.
 */
export async function loadPersonnel360RealDataSlice(
  personnelId: string
): Promise<Personnel360RealDataSlice | null> {
  const personnel = await fetchPersonnelById(personnelId);
  if (!personnel) return null;

  const [manager, linkedUsers] = await Promise.all([
    personnel.reports_to_person_id
      ? fetchReportsToPersonnel(personnel.reports_to_person_id)
      : Promise.resolve(null),
    personnel.profile_id
      ? fetchLinkedUsers([personnel.profile_id])
      : Promise.resolve(new Map<string, LinkedUserInfo>()),
  ]);

  const linkedUser = personnel.profile_id
    ? linkedUsers.get(personnel.profile_id) ?? null
    : null;

  const raw: Personnel360RawData = {
    personnel,
    manager,
    linkedUser,
  };

  return mapRawToPersonnel360Slice(raw);
}

// ─── Mapper ─────────────────────────────────────────────────────────────────

/**
 * Transforms raw DB/query results into the Personnel360Data slice shape.
 * Only maps fields supported by current schema; others are omitted (mock fallback).
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

  const slice: Personnel360RealDataSlice = {
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
    kpi: [
      { label: "Yetki Seviyesi", value: personnel.rbac_role ?? "—" },
    ],
  };

  return slice;
}
