"use client";

import { supabaseBrowser } from "@/lib/supabase/client";

export async function meApiFetch(path: string, init?: RequestInit): Promise<Response> {
  const { data } = await supabaseBrowser.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(path, { ...init, headers });
}
