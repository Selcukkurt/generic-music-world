"use client";

/**
 * Audit logs data access layer.
 * Fetches from /api/audit-logs (Supabase audit_logs table).
 */

import { supabaseBrowser } from "@/lib/supabase/client";
import type { LogFilters, LogsQueryResult } from "./types";

export async function fetchLogs(
  filters: LogFilters,
  page: number,
  pageSize: number
): Promise<LogsQueryResult> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (filters.search) params.set("search", filters.search);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.severities?.length) params.set("severities", filters.severities.join(","));
  if (filters.category) params.set("category", filters.category);
  if (filters.status) params.set("status", filters.status);
  if (filters.actor) params.set("actor", filters.actor);

  const { data } = await supabaseBrowser.auth.getSession();
  const token = data?.session?.access_token;
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`/api/audit-logs?${params.toString()}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const msg = (err as { error?: string }).error ?? res.statusText;
    if (res.status === 401) throw new Error("Oturum açmanız gerekiyor.");
    if (res.status === 403) throw new Error("Bu sayfaya erişim yetkiniz yok.");
    throw new Error(msg);
  }
  return res.json() as Promise<LogsQueryResult>;
}
