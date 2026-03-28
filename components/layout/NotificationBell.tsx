"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  FileText,
  MessageSquare,
  ShieldAlert,
  Trash2,
  User,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  meta: Record<string, any> | null;
  created_at: string;
};

function formatWhen(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getNotificationHref(item: NotificationRow) {
  const meta = item.meta || {};

  if (meta.booking_id) {
    return `/messages/${meta.booking_id}`;
  }

  if (meta.job_id && item.type === "job_application") {
    return `/my-job-posts?job=${meta.job_id}${
      meta.application_id ? `&application=${meta.application_id}` : ""
    }`;
  }

  if (meta.job_id && item.type === "job_status_updated") {
    return "/my-job-posts";
  }

  if (
    item.type === "application_accepted" ||
    item.type === "application_rejected"
  ) {
    return "/my-applications";
  }

  if (item.type === "application_accepted_confirmation") {
    return "/my-job-posts";
  }

  if (item.type === "job_submitted_for_review") {
    return "/admin";
  }

  if (item.type === "new_message") {
    return meta.booking_id ? `/messages/${meta.booking_id}` : "/messages";
  }

  if (item.type.includes("report")) {
    return "/admin/reports";
  }

  return "/notifications";
}

function getNotificationIcon(type: string) {
  if (type === "new_message") return MessageSquare;
  if (type === "job_application") return FileText;
  if (type === "application_accepted") return CheckCircle2;
  if (type === "application_rejected") return XCircle;
  if (type === "application_accepted_confirmation") return CheckCircle2;
  if (type === "job_status_updated") return Briefcase;
  if (type === "job_submitted_for_review") return ShieldAlert;
  return Bell;
}

export default function NotificationBell({ userId }: { userId: string }) {
  const supabase = createClient();
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  async function loadNotifications() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("notifications")
        .select("id, user_id, type, title, body, is_read, meta, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) {
        console.error("load notifications error:", error);
        return;
      }

      setNotifications((data || []) as NotificationRow[]);
    } catch (error) {
      console.error("load notifications crash:", error);
    } finally {
      setLoading(false);
    }
  }

  async function markOneAsRead(id: string) {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        console.error("mark one notification error:", error);
        return;
      }

      setNotifications((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_read: true } : item
        )
      );
    } catch (error) {
      console.error("mark one notification crash:", error);
    }
  }

  async function markAllAsRead() {
    try {
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);

      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .in("id", unreadIds);

      if (error) {
        console.error("mark all notifications error:", error);
        return;
      }

      setNotifications((prev) =>
        prev.map((item) => ({ ...item, is_read: true }))
      );
    } catch (error) {
      console.error("mark all notifications crash:", error);
    }
  }

  async function clearAllNotifications() {
    const ok = window.confirm(
      "Clear all notifications? This will permanently remove them."
    );
    if (!ok) return;

    try {
      setClearing(true);

      const res = await fetch("/api/notifications/clear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("clear notifications error:", data?.message);
        return;
      }

      setNotifications([]);
    } catch (error) {
      console.error("clear notifications crash:", error);
    } finally {
      setClearing(false);
    }
  }

  useEffect(() => {
    if (!userId) return;
    void loadNotifications();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const inserted = payload.new as NotificationRow;

          setNotifications((prev) => {
            const next = [inserted, ...prev];
            return next.slice(0, 12);
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as NotificationRow;
          setNotifications((prev) =>
            prev.map((item) => (item.id === updated.id ? updated : item))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const deletedId = payload.old.id as string;
          setNotifications((prev) => prev.filter((item) => item.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
        aria-label="Open notifications"
      >
        <Bell className="h-5 w-5" />

        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-[20px] rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[11px] font-bold text-white shadow">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-14 z-[80] w-[360px] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Notifications</h3>
              <p className="mt-1 text-xs text-slate-500">
                {notifications.length > 0
                  ? `${notifications.length} total notification${
                      notifications.length > 1 ? "s" : ""
                    }`
                  : "You are all caught up"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={() => void markAllAsRead()}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Mark all read
                </button>
              ) : null}

              {notifications.length > 0 ? (
                <button
                  type="button"
                  onClick={() => void clearAllNotifications()}
                  disabled={clearing}
                  className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {clearing ? "Clearing..." : "Clear all"}
                </button>
              ) : null}
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="animate-pulse rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="h-4 w-32 rounded bg-slate-200" />
                    <div className="mt-3 h-3 w-full rounded bg-slate-100" />
                    <div className="mt-2 h-3 w-2/3 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <div className="rounded-full bg-slate-100 p-4">
                  <Bell className="h-6 w-6 text-slate-500" />
                </div>
                <h4 className="mt-4 text-sm font-semibold text-slate-900">
                  No notifications yet
                </h4>
                <p className="mt-2 max-w-[240px] text-sm leading-6 text-slate-500">
                  Updates about jobs, messages, and approvals will appear here.
                </p>
              </div>
            ) : (
              <div className="p-3">
                {notifications.map((item) => {
                  const Icon = getNotificationIcon(item.type);
                  const href = getNotificationHref(item);

                  return (
                    <Link
                      key={item.id}
                      href={href}
                      onClick={() => {
                        setOpen(false);
                        if (!item.is_read) {
                          void markOneAsRead(item.id);
                        }
                      }}
                      className={`group mb-2 flex items-start gap-3 rounded-2xl border p-4 transition ${
                        item.is_read
                          ? "border-slate-200 bg-white hover:bg-slate-50"
                          : "border-indigo-100 bg-indigo-50/60 hover:bg-indigo-50"
                      }`}
                    >
                      <div
                        className={`mt-0.5 rounded-2xl p-2 ${
                          item.is_read ? "bg-slate-100" : "bg-white"
                        }`}
                      >
                        <Icon className="h-4 w-4 text-slate-700" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <h4
                            className={`text-sm ${
                              item.is_read
                                ? "font-semibold text-slate-800"
                                : "font-bold text-slate-900"
                            }`}
                          >
                            {item.title}
                          </h4>

                          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" />
                        </div>

                        {item.body ? (
                          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                            {item.body}
                          </p>
                        ) : null}

                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span className="text-xs text-slate-400">
                            {formatWhen(item.created_at)}
                          </span>

                          {!item.is_read ? (
                            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                              New
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <User className="h-4 w-4" />
              View all notifications
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
