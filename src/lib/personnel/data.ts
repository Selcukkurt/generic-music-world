"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import type { Profile } from "./types";

export type PersonnelFilters = {
  search?: string;
  role?: string;
  department?: string;
  status?: "active" | "inactive" | "all";
};

export async function fetchProfiles(filters: PersonnelFilters): Promise<Profile[]> {
  let query = supabaseBrowser
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true, nullsFirst: false })
    .limit(200);

  if (filters.search?.trim()) {
    const q = `%${filters.search.trim()}%`;
    query = query.or(`full_name.ilike.${q},email.ilike.${q}`);
  }
  if (filters.role && filters.role !== "all") {
    query = query.eq("role", filters.role);
  }
  if (filters.department && filters.department !== "all") {
    query = query.eq("department", filters.department);
  }
  if (filters.status === "active") {
    query = query.eq("is_active", true);
  } else if (filters.status === "inactive") {
    query = query.eq("is_active", false);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Profile[];
}

export async function updateProfile(
  id: string,
  payload: Partial<Pick<Profile, "role" | "department" | "team" | "title" | "phone" | "is_active" | "full_name">>
): Promise<void> {
  const { error } = await supabaseBrowser
    .from("profiles")
    .update(payload)
    .eq("id", id);

  if (error) throw new Error(error.message);
}
