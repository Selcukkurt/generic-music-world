/**
 * Personnel 360 read-only queries.
 * Fetches personnel base data for the loader layer.
 */

import {
  fetchPersonnelById,
  fetchReportsToPersonnel,
  fetchLinkedUsers,
  type PersonnelRecord,
  type LinkedUserInfo,
} from "@/lib/m04/personnel";
import type { Personnel360RawData } from "../types/personnel360.types";

/**
 * Fetches raw personnel data for Personnel 360.
 * Read-only; no mutations. Returns null if personnel not found.
 */
export async function fetchPersonnel360Raw(personnelId: string): Promise<Personnel360RawData | null> {
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

  return {
    personnel,
    manager,
    linkedUser,
  };
}
