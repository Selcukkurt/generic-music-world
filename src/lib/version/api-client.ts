"use client";

import { supabaseBrowser } from "@/lib/supabase/client";

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data } = await supabaseBrowser.auth.getSession();
  const token = data?.session?.access_token;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export async function versionFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/version${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers } as HeadersInit,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}
