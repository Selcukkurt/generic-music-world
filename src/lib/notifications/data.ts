"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import type { Notification } from "./utils";

const LIMIT = 50;

export async function fetchNotifications(
  userId: string,
  filterUnreadOnly: boolean
): Promise<Notification[]> {
  let query = supabaseBrowser
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(LIMIT);

  if (filterUnreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Notification[];
}

export async function markAsRead(id: string): Promise<void> {
  const { error } = await supabaseBrowser
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function markAsUnread(id: string): Promise<void> {
  const { error } = await supabaseBrowser
    .from("notifications")
    .update({ is_read: false, read_at: null })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function markAllAsRead(userId: string): Promise<void> {
  const { error } = await supabaseBrowser
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw new Error(error.message);
}
