"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import type { ApprovalRequest } from "./types";

export type ListFilters = {
  status?: string;
  requestType?: string;
  search?: string;
};

export async function fetchApprovalRequests(
  userId: string,
  isAdmin: boolean,
  filters: ListFilters
): Promise<ApprovalRequest[]> {
  let query = supabaseBrowser
    .from("approval_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query = query.eq("requested_by", userId);
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.requestType && filters.requestType !== "all") {
    query = query.eq("request_type", filters.requestType);
  }
  if (filters.search?.trim()) {
    const s = filters.search.trim();
    query = query.or(`title.ilike.%${s}%,description.ilike.%${s}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ApprovalRequest[];
}

export async function createApprovalRequest(
  userId: string,
  payload: {
    request_type: string;
    title: string;
    description?: string | null;
    priority?: string;
  }
): Promise<ApprovalRequest> {
  const { data, error } = await supabaseBrowser
    .from("approval_requests")
    .insert({
      requested_by: userId,
      request_type: payload.request_type,
      title: payload.title,
      description: payload.description ?? null,
      priority: payload.priority ?? "normal",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ApprovalRequest;
}

export async function approveRequest(
  id: string,
  userId: string,
  reason?: string | null
): Promise<void> {
  const { error } = await supabaseBrowser
    .from("approval_requests")
    .update({
      status: "approved",
      decided_by: userId,
      decided_at: new Date().toISOString(),
      decision_reason: reason ?? null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function rejectRequest(
  id: string,
  userId: string,
  reason: string
): Promise<void> {
  const { error } = await supabaseBrowser
    .from("approval_requests")
    .update({
      status: "rejected",
      decided_by: userId,
      decided_at: new Date().toISOString(),
      decision_reason: reason,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}
