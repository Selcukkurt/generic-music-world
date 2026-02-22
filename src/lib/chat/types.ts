/**
 * Chat types.
 */

export interface ChatThread {
  id: string;
  created_at: string;
  is_group: boolean;
  title: string | null;
  last_message_at: string | null;
  created_by: string;
}

export interface ChatThreadMember {
  thread_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string | null;
}

export interface ChatMessage {
  id: string;
  created_at: string;
  thread_id: string;
  sender_id: string;
  body: string;
  metadata: Record<string, unknown>;
}

export interface ChatThreadWithDetails extends ChatThread {
  members?: { user_id: string; full_name: string | null; email: string | null; avatar_url: string | null }[];
  last_message?: { body: string; created_at: string } | null;
}
