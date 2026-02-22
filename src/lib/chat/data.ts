"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import type { ChatThread, ChatMessage } from "./types";

/** Find or create DM thread between current user and target user. */
export async function findOrCreateDmThread(
  currentUserId: string,
  targetUserId: string
): Promise<ChatThread> {
  if (currentUserId === targetUserId) {
    throw new Error("Kendinizle sohbet başlatamazsınız.");
  }

  const { data: existing } = await supabaseBrowser
    .from("chat_thread_members")
    .select("thread_id")
    .eq("user_id", currentUserId);

  if (!existing?.length) {
    return createDmThread(currentUserId, targetUserId);
  }

  const threadIds = existing.map((r) => r.thread_id);

  const { data: dmThread } = await supabaseBrowser
    .from("chat_threads")
    .select("id, created_at, is_group, title, last_message_at, created_by")
    .eq("is_group", false)
    .in("id", threadIds);

  if (!dmThread?.length) {
    return createDmThread(currentUserId, targetUserId);
  }

  for (const thread of dmThread) {
    const { data: members } = await supabaseBrowser
      .from("chat_thread_members")
      .select("user_id")
      .eq("thread_id", thread.id);

    const userIds = (members ?? []).map((m) => m.user_id).sort();
    const pair = [currentUserId, targetUserId].sort();
    if (userIds.length === 2 && userIds[0] === pair[0] && userIds[1] === pair[1]) {
      return thread as ChatThread;
    }
  }

  return createDmThread(currentUserId, targetUserId);
}

async function createDmThread(creatorId: string, otherUserId: string): Promise<ChatThread> {
  const { data: thread, error: threadErr } = await supabaseBrowser
    .from("chat_threads")
    .insert({
      is_group: false,
      created_by: creatorId,
    })
    .select()
    .single();

  if (threadErr || !thread) throw new Error(threadErr?.message ?? "Thread oluşturulamadı.");

  const { error: membersErr } = await supabaseBrowser.from("chat_thread_members").insert([
    { thread_id: thread.id, user_id: creatorId },
    { thread_id: thread.id, user_id: otherUserId },
  ]);

  if (membersErr) throw new Error(membersErr.message);

  return thread as ChatThread;
}

export async function fetchThreads(userId: string): Promise<ChatThread[]> {
  const { data: memberRows } = await supabaseBrowser
    .from("chat_thread_members")
    .select("thread_id")
    .eq("user_id", userId);

  if (!memberRows?.length) return [];

  const threadIds = memberRows.map((r) => r.thread_id);

  const { data, error } = await supabaseBrowser
    .from("chat_threads")
    .select("*")
    .in("id", threadIds)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ChatThread[];
}

export async function fetchThreadWithMembers(threadId: string): Promise<{
  thread: ChatThread;
  members: { user_id: string; full_name: string | null; email: string | null; avatar_url: string | null; role?: string | null; department?: string | null }[];
}> {
  const { data: thread, error: threadErr } = await supabaseBrowser
    .from("chat_threads")
    .select("*")
    .eq("id", threadId)
    .single();

  if (threadErr || !thread) throw new Error(threadErr?.message ?? "Thread bulunamadı.");

  const { data: members } = await supabaseBrowser
    .from("chat_thread_members")
    .select("user_id")
    .eq("thread_id", threadId);

  const userIds = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = await supabaseBrowser
    .from("profiles")
    .select("id, full_name, email, avatar_url, role, department")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      {
        user_id: p.id,
        full_name: p.full_name,
        email: p.email,
        avatar_url: p.avatar_url,
        role: p.role,
        department: p.department,
      },
    ])
  );

  const memberList = userIds.map((id) =>
    profileMap.get(id) ?? { user_id: id, full_name: null, email: null, avatar_url: null, role: null, department: null }
  );

  return { thread: thread as ChatThread, members: memberList };
}

export async function fetchMessages(threadId: string, limit = 50): Promise<ChatMessage[]> {
  const { data, error } = await supabaseBrowser
    .from("chat_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return ((data ?? []) as ChatMessage[]).reverse();
}

export async function sendMessage(
  threadId: string,
  senderId: string,
  body: string
): Promise<ChatMessage> {
  const { data, error } = await supabaseBrowser
    .from("chat_messages")
    .insert({ thread_id: threadId, sender_id: senderId, body: body.trim() })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ChatMessage;
}
