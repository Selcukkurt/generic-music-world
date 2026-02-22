"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PageHeader from "@/components/shell/PageHeader";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/ToastProvider";
import {
  fetchNotifications,
  markAsRead,
  markAsUnread,
  markAllAsRead,
} from "@/lib/notifications/data";
import type { Notification } from "@/lib/notifications/utils";
import { formatRelativeTime, NotificationIcon } from "@/lib/notifications/utils";

type Filter = "all" | "unread";

export default function NotificationsClient() {
  const toast = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      if (!user || cancelled) return;
      setUserId(user.id);
      setLoading(true);
      try {
        const list = await fetchNotifications(user.id, filter === "unread");
        if (!cancelled) setNotifications(list);
      } catch (err) {
        if (!cancelled) {
          toast.error("Hata", err instanceof Error ? err.message : "Bildirimler yüklenemedi.");
          setNotifications([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [filter, toast]);

  const searchLower = search.trim().toLowerCase();
  const filtered = searchLower
    ? notifications.filter(
        (n) =>
          n.title.toLowerCase().includes(searchLower) ||
          (n.message?.toLowerCase().includes(searchLower) ?? false)
      )
    : notifications;
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkRead = useCallback(
    async (n: Notification) => {
      if (n.is_read) return;
      const prev = [...notifications];
      setNotifications((list) =>
        list.map((x) => (x.id === n.id ? { ...x, is_read: true, read_at: new Date().toISOString() } : x))
      );
      try {
        await markAsRead(n.id);
      } catch {
        setNotifications(prev);
        toast.error("Hata", "Okundu işaretlenemedi.");
      }
    },
    [notifications, toast]
  );

  const handleMarkUnread = useCallback(
    async (n: Notification) => {
      if (!n.is_read) return;
      const prev = [...notifications];
      setNotifications((list) =>
        list.map((x) => (x.id === n.id ? { ...x, is_read: false, read_at: null } : x))
      );
      try {
        await markAsUnread(n.id);
      } catch {
        setNotifications(prev);
        toast.error("Hata", "Okunmadı işaretlenemedi.");
      }
    },
    [notifications, toast]
  );

  const handleMarkAllRead = useCallback(async () => {
    if (!userId || unreadCount === 0) return;
    const prev = [...notifications];
    setNotifications((list) =>
      list.map((x) => (x.is_read ? x : { ...x, is_read: true, read_at: new Date().toISOString() }))
    );
    try {
      await markAllAsRead(userId);
      toast.success("Tamamlandı", "Tüm bildirimler okundu işaretlendi.");
    } catch {
      setNotifications(prev);
      toast.error("Hata", "Tümünü okundu işaretlenemedi.");
    }
  }, [userId, unreadCount, notifications, toast]);

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Bildirimler"
        subtitle="Sistem ve işlem bildirimlerin burada listelenir."
      >
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ui-input w-40 py-2 text-sm"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            className="ui-input w-36 py-2 text-sm"
          >
            <option value="all">Tümü</option>
            <option value="unread">Okunmamış</option>
          </select>
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Tümünü okundu işaretle
          </button>
        </div>
      </PageHeader>

      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden backdrop-blur-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-surface2)]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <svg
              className="h-12 w-12 ui-text-muted mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <p className="text-sm font-medium text-[var(--color-text)]">
              {filter === "unread" ? "Okunmamış bildirim yok." : "Henüz bildirim yok."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {filtered.map((n) => (
              <li
                key={n.id}
                className={`flex gap-4 p-4 transition hover:bg-[var(--color-surface-hover)]/50 ${
                  !n.is_read ? "bg-[var(--color-surface2)]/30" : ""
                }`}
              >
                <div className="flex shrink-0 items-start gap-2 pt-0.5">
                  <NotificationIcon type={n.type} />
                  {!n.is_read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--brand-yellow)]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${n.is_read ? "ui-text-secondary" : "text-[var(--color-text)]"}`}>
                    {n.title}
                  </p>
                  {n.message && (
                    <p className="mt-0.5 text-sm ui-text-muted line-clamp-2">{n.message}</p>
                  )}
                  <p className="mt-1 text-xs ui-text-muted">{formatRelativeTime(n.created_at)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => (n.is_read ? handleMarkUnread(n) : handleMarkRead(n))}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-3 py-1.5 text-xs font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
                  >
                    {n.is_read ? "Okunmadı" : "Okundu"}
                  </button>
                  {n.action_url && (
                    <Link
                      href={n.action_url}
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-3 py-1.5 text-xs font-medium text-[var(--brand-yellow)] transition hover:bg-[var(--color-surface-hover)]"
                    >
                      Git
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
