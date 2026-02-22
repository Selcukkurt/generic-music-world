"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import type { CalendarEvent } from "./types";

/** Default: next 30 days from now */
function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 7);
  const to = new Date(now);
  to.setDate(to.getDate() + 30);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

export type CalendarFilters = {
  status?: string;
  eventType?: string;
};

/** Get first day of month grid (Monday) and last day for a given year/month. */
export function getMonthGridRange(year: number, month: number): { from: string; to: string } {
  const first = new Date(year, month, 1);
  const dow = first.getDay();
  const offset = dow === 0 ? 6 : dow - 1;
  const start = new Date(year, month, 1 - offset);
  const end = new Date(start);
  end.setDate(end.getDate() + 41);
  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

export async function fetchCalendarEventsByMonth(
  userId: string,
  isAdmin: boolean,
  year: number,
  month: number,
  filters: CalendarFilters
): Promise<CalendarEvent[]> {
  const { from, to } = getMonthGridRange(year, month);

  let query = supabaseBrowser
    .from("calendar_events")
    .select("*")
    .gte("start_at", from)
    .lte("start_at", to)
    .order("start_at", { ascending: true });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.eventType && filters.eventType !== "all") {
    query = query.eq("event_type", filters.eventType);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as CalendarEvent[];
}

export async function fetchCalendarEvents(
  userId: string,
  isAdmin: boolean,
  filters: CalendarFilters
): Promise<CalendarEvent[]> {
  const { from, to } = defaultRange();

  let query = supabaseBrowser
    .from("calendar_events")
    .select("*")
    .gte("start_at", from)
    .lte("start_at", to)
    .order("start_at", { ascending: true });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.eventType && filters.eventType !== "all") {
    query = query.eq("event_type", filters.eventType);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as CalendarEvent[];
}

export async function fetchPendingEvents(userId: string): Promise<CalendarEvent[]> {
  const { data, error } = await supabaseBrowser
    .from("calendar_events")
    .select("*")
    .eq("status", "pending")
    .order("start_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CalendarEvent[];
}

export async function createCalendarEvent(
  userId: string,
  payload: {
    title: string;
    description?: string | null;
    start_at: string;
    end_at: string;
    timezone?: string;
    location?: string | null;
    event_type: string;
    visibility: string;
  }
): Promise<CalendarEvent> {
  const { data, error } = await supabaseBrowser
    .from("calendar_events")
    .insert({
      created_by: userId,
      title: payload.title,
      description: payload.description ?? null,
      start_at: payload.start_at,
      end_at: payload.end_at,
      timezone: payload.timezone ?? "Europe/Istanbul",
      location: payload.location ?? null,
      event_type: payload.event_type,
      visibility: payload.visibility,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as CalendarEvent;
}

export async function approveEvent(id: string, userId: string, reason?: string | null): Promise<void> {
  const { error } = await supabaseBrowser
    .from("calendar_events")
    .update({
      status: "approved",
      decided_by: userId,
      decided_at: new Date().toISOString(),
      decision_reason: reason ?? null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function rejectEvent(id: string, userId: string, reason: string): Promise<void> {
  const { error } = await supabaseBrowser
    .from("calendar_events")
    .update({
      status: "rejected",
      decided_by: userId,
      decided_at: new Date().toISOString(),
      decision_reason: reason,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function cancelEvent(id: string, userId: string): Promise<void> {
  const { error } = await supabaseBrowser
    .from("calendar_events")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("created_by", userId);

  if (error) throw new Error(error.message);
}

export async function updateCalendarEvent(
  id: string,
  userId: string,
  payload: Partial<Pick<CalendarEvent, "title" | "description" | "start_at" | "end_at" | "location" | "event_type" | "visibility">>
): Promise<void> {
  const { error } = await supabaseBrowser
    .from("calendar_events")
    .update(payload)
    .eq("id", id)
    .eq("created_by", userId)
    .eq("status", "pending");

  if (error) throw new Error(error.message);
}
