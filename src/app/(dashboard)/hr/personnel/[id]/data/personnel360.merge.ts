/**
 * Merges real Personnel 360 data slice with mock data.
 * Real values override mock where present; mock fills gaps for unsupported fields.
 */

import type { Personnel360Data } from "./personnel360.types";
import type { Personnel360RealDataSlice } from "./personnel360.real";

/**
 * Merges real slice into mock base. Real values take precedence; null/undefined in real
 * are ignored (mock kept). Handles partial header, overview.identity, overview.orgPosition,
 * and kpi (merged by label).
 */
export function mergePersonnel360Data(
  mock: Personnel360Data,
  realSlice: Personnel360RealDataSlice | null
): Personnel360Data {
  if (!realSlice) return mock;

  const merged: Personnel360Data = {
    ...mock,
    header: realSlice.header
      ? { ...mock.header, ...omitEmpty(realSlice.header) }
      : mock.header,
    overview: {
      ...mock.overview,
      identity: realSlice.overview?.identity
        ? { ...mock.overview.identity, ...omitEmpty(realSlice.overview.identity) }
        : mock.overview.identity,
      orgPosition: realSlice.overview?.orgPosition
        ? { ...mock.overview.orgPosition, ...omitEmpty(realSlice.overview.orgPosition) }
        : mock.overview.orgPosition,
    },
    kpi: mergeKpiByLabel(mock.kpi, realSlice.kpi),
  };

  return merged;
}

function omitEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") {
      (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}

function mergeKpiByLabel(
  mockKpi: Array<{ label: string; value: string }>,
  realKpi?: Array<{ label: string; value: string }>
): Array<{ label: string; value: string }> {
  if (!realKpi || !Array.isArray(realKpi) || realKpi.length === 0) {
    return mockKpi;
  }
  const realByLabel = new Map<string, string>();
  for (const item of realKpi) {
    if (item?.label && item?.value != null) {
      realByLabel.set(item.label, String(item.value));
    }
  }
  return mockKpi.map((m) => {
    const realVal = realByLabel.get(m.label);
    return realVal !== undefined ? { label: m.label, value: realVal } : m;
  });
}
