/**
 * Personnel 360 data loader.
 * Fetches personnel base data, maps to Personnel360Data, merges with mock fallback.
 */

import { fetchPersonnel360Raw } from "../queries/personnelQueries";
import { mapRawToPersonnel360Slice } from "../mappers/personnel360Mapper";
import type { Personnel360RealDataSlice } from "../types/personnel360.types";
import { getPersonnel360MockData } from "@/app/(dashboard)/hr/personnel/[id]/data/personnel360.mock";
import { mergePersonnel360Data } from "@/app/(dashboard)/hr/personnel/[id]/data/personnel360.merge";
import type { Personnel360Data } from "@/app/(dashboard)/hr/personnel/[id]/data/personnel360.types";

/**
 * Loads Personnel 360 data for the given personnel ID.
 * Fetches real data from DB, maps to slice, merges with mock fallback.
 * Returns full Personnel360Data (mock + real overlay).
 */
export async function loadPersonnel360(personnelId: string): Promise<Personnel360Data> {
  const raw = await fetchPersonnel360Raw(personnelId);
  const realSlice: Personnel360RealDataSlice | null = raw
    ? mapRawToPersonnel360Slice(raw)
    : null;
  const mock = getPersonnel360MockData(personnelId);
  return mergePersonnel360Data(mock, realSlice);
}
