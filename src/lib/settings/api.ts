"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import type { SystemSettings } from "./types";

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data } = await supabaseBrowser.auth.getSession();
  const token = data?.session?.access_token;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export async function fetchSettings(): Promise<SystemSettings | null> {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/settings", { headers });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) return null;
    throw new Error("Failed to fetch settings");
  }
  const json = await res.json();
  return json.settings as SystemSettings | null;
}

export async function updateSettings(
  settings: SystemSettings,
  changedFields: string[]
): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/settings", {
    method: "PUT",
    headers,
    body: JSON.stringify({ settings, changedFields }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Failed to save settings");
  }
}
