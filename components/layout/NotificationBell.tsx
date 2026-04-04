"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Briefcase,
  CheckCircle2,
  FileText,
  MessageSquare,
  ShieldAlert,
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

  if (meta.booking_id) return `/messages/${meta.booking_id}`;

  if (meta.job_id && meta.application_id) {
    return `/my-job-posts?job=${meta.job_id}&application=${meta.application_id}`;
  }

  if (meta.job_id) return `/my-job-posts?job=${meta.job_id}`;

  return "/notifications";
}

function getNotificationIcon(type: string) {
  if (type.includes("message")) return MessageSquare;
  if (type.includes("application")) return FileText;
  if (type.includes("accepted")) return CheckCircle2;
  if (type.includes("rejected")) return XCircle;
  if (type.includes("job")) return Briefcase;
  if (type.includes("admin")) return ShieldAlert;
  return Bell;
}

export default function NotificationBell({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [clearing, setClearing] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  async function loadNotifications() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) {
        console.error("load notifications error:", error);
        return;
      }

      setNotifications(data || []);
    } finally {
      setLoading(false);
    }
  }

  async function markAllAsRead() {
    const ids = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (!ids.length) return;

    try {
      setMarkingRead(true);

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", ids);

      if (error) {
        console.error("mark all as read error:", error);
        return;
      }

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
    } finally {
      setMarkingRead(false);
    }
  }

  async function clearAllNotifications() {
    const ok = window.confirm("Delete all notifications?");
    if (!ok) return;

    try {
      setClearing(true);

      const res = await fetch("/api/notifications/clear", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        console.error("clear notifications error:", data);
        return;
      }

      setNotifications([]);
    } catch (error) {
      console.error("clear notifications error:", error);
    } finally {
      setClearing(false);
    }
  }

  useEffect(() => {
    if (!userId) return;

    loadNotifications();

    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative h-11 w-11 rounded-2xl border bg-white"
      >
        <Bell className="mx-auto" />
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 rounded-full bg-red-500 px-1 text-xs text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl bg-white shadow-xl">
          <div className="flex justify-between border-b p-4">
            <b>Notifications</b>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs"
                disabled={markingRead}
              >
                {markingRead ? "..." : "Read all"}
              </button>
              <button
                type="button"
                onClick={clearAllNotifications}
                className="text-xs text-red-600"
                disabled={clearing}
              >
                {clearing ? "..." : "Clear"}
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-sm">Loading...</p>
            ) : notifications.length === 0 ? (
              <p className="p-4 text-sm">No notifications</p>
            ) : (
              notifications.map((n) => {
                const Icon = getNotificationIcon(n.type);

                return (
                  <Link
                    key={n.id}
                    href={getNotificationHref(n)}
                    className={`flex gap-3 border-b p-4 ${
                      n.is_read ? "" : "bg-indigo-50"
                    }`}
                  >
                    <Icon className="mt-1 h-4 w-4" />

                    <div>
                      <div className="text-sm font-semibold">{n.title}</div>
                      {n.body && (
                        <div className="text-xs text-gray-500">{n.body}</div>
                      )}
                      <div className="text-xs text-gray-400">
                        {formatWhen(n.created_at)}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          <div className="border-t p-3 text-center">
            <Link href="/notifications">View all</Link>
          </div>
        </div>
      )}
    </div>
  );
}