"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/components/ui/ToastProvider";
import PageHeader from "@/components/shell/PageHeader";
import { fetchProfiles } from "@/lib/personnel/data";
import {
  fetchThreads,
  findOrCreateDmThread,
  fetchThreadWithMembers,
  fetchMessages,
  sendMessage,
} from "@/lib/chat/data";
import type { ChatThread, ChatMessage } from "@/lib/chat/types";
import type { Profile } from "@/lib/personnel/types";
import { ROLE_LABELS } from "@/lib/personnel/types";
import { supabaseBrowser } from "@/lib/supabase/client";

function getInitials(profile: { full_name?: string | null; email?: string | null }): string {
  if (profile.full_name?.trim()) {
    const parts = profile.full_name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return profile.full_name.slice(0, 2).toUpperCase();
  }
  if (profile.email) return profile.email.slice(0, 2).toUpperCase();
  return "?";
}

export default function ChatClient() {
  const toast = useToast();
  const { user } = useCurrentUser();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [threadDetails, setThreadDetails] = useState<Record<string, { members: { user_id: string; full_name: string | null; email: string | null; avatar_url: string | null; role?: string | null; department?: string | null }[] }>>({});
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [composer, setComposer] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabaseBrowser.channel> | null>(null);

  const loadThreads = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = await fetchThreads(user.id);
      setThreads(list);
      const details = await Promise.all(
        list.map(async (t) => {
          const { members } = await fetchThreadWithMembers(t.id);
          return { id: t.id, members };
        })
      );
      setThreadDetails((prev) => ({
        ...prev,
        ...Object.fromEntries(details.map((d) => [d.id, { members: d.members }])),
      }));
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Sohbetler yüklenemedi.");
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  const loadMessages = useCallback(
    async (threadId: string) => {
      setMessagesLoading(true);
      try {
        const list = await fetchMessages(threadId);
        setMessages(list);
      } catch (err) {
        toast.error("Hata", err instanceof Error ? err.message : "Mesajlar yüklenemedi.");
        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    if (selectedThread) {
      loadMessages(selectedThread.id);
    } else {
      setMessages([]);
    }
  }, [selectedThread?.id, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!selectedThread || !user) return;

    const channel = supabaseBrowser
      .channel(`chat:${selectedThread.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `thread_id=eq.${selectedThread.id}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabaseBrowser.removeChannel(channel);
      channelRef.current = null;
    };
  }, [selectedThread?.id, user]);

  const handleStartChat = useCallback(
    async (target: Profile) => {
      if (!user || target.id === user.id) return;
      setProfilesLoading(true);
      try {
        const thread = await findOrCreateDmThread(user.id, target.id);
        const { members } = await fetchThreadWithMembers(thread.id);
        setThreadDetails((prev) => ({ ...prev, [thread.id]: { members } }));
        setThreads((prev) => {
          const exists = prev.some((t) => t.id === thread.id);
          if (exists) return prev.map((t) => (t.id === thread.id ? thread : t));
          return [thread, ...prev];
        });
        setSelectedThread(thread);
        setShowNewChat(false);
      } catch (err) {
        toast.error("Hata", err instanceof Error ? err.message : "Sohbet başlatılamadı.");
      } finally {
        setProfilesLoading(false);
      }
    },
    [user, toast]
  );

  const handleSend = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!user || !selectedThread || !composer.trim()) return;
      const body = composer.trim();
      setComposer("");
      setSending(true);
      try {
        const msg = await sendMessage(selectedThread.id, user.id, body);
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      } catch (err) {
        toast.error("Hata", err instanceof Error ? err.message : "Mesaj gönderilemedi.");
        setComposer(body);
      } finally {
        setSending(false);
      }
    },
    [user, selectedThread, composer, toast]
  );

  const handleOpenNewChat = useCallback(async () => {
    setShowNewChat(true);
    setProfilesLoading(true);
    try {
      const list = await fetchProfiles({ status: "active" });
      setProfiles(list.filter((p) => p.id !== user?.id));
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Kullanıcılar yüklenemedi.");
      setProfiles([]);
    } finally {
      setProfilesLoading(false);
    }
  }, [user?.id, toast]);

  const getThreadDisplay = (thread: ChatThread) => {
    const members = threadDetails[thread.id]?.members ?? [];
    const other = members.find((m) => m.user_id !== user?.id);
    return other?.full_name || other?.email || "Sohbet";
  };

  const getThreadSubtitle = (thread: ChatThread) => {
    const members = threadDetails[thread.id]?.members ?? [];
    const other = members.find((m) => m.user_id !== user?.id);
    if (other) {
      const role = other.role;
      const dept = other.department;
      if (role && dept) return `${ROLE_LABELS[role as keyof typeof ROLE_LABELS]} · ${dept}`;
      if (role) return ROLE_LABELS[role as keyof typeof ROLE_LABELS];
      if (dept) return dept;
      return other.email ?? "";
    }
    return "";
  };

  const counterpart = selectedThread
    ? threadDetails[selectedThread.id]?.members?.find((m) => m.user_id !== user?.id)
    : null;

  const filteredThreads = threads.filter((t) => {
    const name = getThreadDisplay(t).toLowerCase();
    return !search.trim() || name.includes(search.trim().toLowerCase());
  });

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col gap-4">
      <PageHeader title="Sohbet" subtitle="Ekip içi mesajlaşma" />

      <div className="flex flex-1 min-h-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden">
        <aside className="flex w-[320px] shrink-0 flex-col border-r border-[var(--color-border)]">
          <div className="flex gap-2 border-b border-[var(--color-border)] p-3">
            <input
              type="text"
              placeholder="Ara…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ui-input flex-1 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleOpenNewChat}
              className="ui-button-primary shrink-0 rounded-lg px-3 py-2 text-sm font-semibold"
            >
              Yeni Sohbet
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-surface2)]" />
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-4 text-center text-sm ui-text-muted">
                {search ? "Bu aramada sonuç yok." : "Henüz sohbet yok. Yeni Sohbet ile başlayın."}
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {filteredThreads.map((thread) => {
                  const members = threadDetails[thread.id]?.members ?? [];
                  const other = members.find((m) => m.user_id !== user?.id);
                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => setSelectedThread(thread)}
                      className={`flex w-full items-center gap-3 p-3 text-left transition hover:bg-[var(--color-surface-hover)]/50 ${
                        selectedThread?.id === thread.id ? "bg-[var(--brand-yellow)]/10" : ""
                      }`}
                    >
                      {other?.avatar_url ? (
                        <img
                          src={other.avatar_url}
                          alt=""
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface2)] text-sm font-medium ui-text-secondary">
                          {getInitials(other ?? {})}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-[var(--color-text)]">
                          {getThreadDisplay(thread)}
                        </p>
                        <p className="truncate text-xs ui-text-muted">{getThreadSubtitle(thread)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <main className="flex flex-1 flex-col min-w-0">
          {selectedThread ? (
            <>
              <header className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
                {counterpart?.avatar_url ? (
                  <img
                    src={counterpart.avatar_url}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface2)] text-sm font-medium ui-text-secondary">
                    {getInitials(counterpart ?? {})}
                  </span>
                )}
                <div>
                  <p className="font-semibold text-[var(--color-text)]">
                    {counterpart?.full_name || counterpart?.email || "Sohbet"}
                  </p>
                  <p className="text-xs ui-text-muted">{counterpart?.email}</p>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-6 w-6 animate-pulse rounded-full bg-[var(--color-surface2)]" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-sm ui-text-muted">
                    Henüz mesaj yok.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.sender_id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                            isOwn
                              ? "bg-[var(--brand-yellow)]/20 text-[var(--color-text)]"
                              : "bg-[var(--color-surface2)] ui-text-secondary"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                          <p className="mt-1 text-[10px] opacity-70">
                            {new Date(msg.created_at).toLocaleTimeString("tr-TR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleSend}
                className="flex gap-2 border-t border-[var(--color-border)] p-4"
              >
                <input
                  type="text"
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  placeholder="Mesaj yazın…"
                  className="ui-input flex-1 py-3"
                  disabled={sending}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                />
                <button
                  type="submit"
                  disabled={sending || !composer.trim()}
                  className="ui-button-primary rounded-lg px-4 py-3 font-semibold disabled:opacity-50"
                >
                  Gönder
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-sm ui-text-muted">
              Sohbet seçin veya yeni sohbet başlatın.
            </div>
          )}
        </main>
      </div>

      {showNewChat && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowNewChat(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Yeni Sohbet</h2>
            <p className="mt-1 text-sm ui-text-muted">Sohbet başlatmak için bir kişi seçin.</p>
            <div className="mt-4 max-h-64 overflow-y-auto space-y-1">
              {profilesLoading ? (
                <div className="py-8 text-center">
                  <div className="mx-auto h-6 w-6 animate-pulse rounded-full bg-[var(--color-surface2)]" />
                </div>
              ) : profiles.length === 0 ? (
                <p className="py-4 text-sm ui-text-muted">Başka kullanıcı bulunamadı.</p>
              ) : (
                profiles.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => handleStartChat(profile)}
                    className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition hover:bg-[var(--color-surface-hover)]"
                  >
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface2)] text-sm font-medium ui-text-secondary">
                        {getInitials(profile)}
                      </span>
                    )}
                    <div>
                      <p className="font-medium text-[var(--color-text)]">
                        {profile.full_name || profile.email || "—"}
                      </p>
                      <p className="text-xs ui-text-muted">{profile.email}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowNewChat(false)}
              className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary"
            >
              İptal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
