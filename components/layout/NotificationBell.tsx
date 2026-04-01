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

  if (meta.booking_id) return `/messages/${meta.booking_id}`;

  if (meta.job_id && item.type === "job_application") {
    return `/my-job-posts?job=${meta.job_id}${
      meta.application_id ? `&application=${meta.application_id}` : ""
    }`;
  }

  if (item.type === "application_accepted" || item.type === "application_rejected") {
    return "/my-applications";
  }

  if (item.type === "job_submitted_for_review") {
    return "/admin";
  }

  if (item.type === "new_message") {
    return meta.booking_id ? `/messages/${meta.booking_id}` : "/messages";
  }

  return "/notifications";
}

function getNotificationIcon(type: string) {
  if (type === "new_message") return MessageSquare;
  if (type === "job_application") return FileText;
  if (type === "application_accepted") return CheckCircle2;
  if (type === "application_rejected") return XCircle;
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
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) {
        console.error(error);
        return;
      }

      setNotifications(data || []);
    } finally {
      setLoading(false);
    }
  }

  async function markAllAsRead() {
    const ids = notifications.filter(n => !n.is_read).map(n => n.id);
    if (ids.length === 0) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", ids);

    setNotifications(prev =>
      prev.map(n => ({ ...n, is_read: true }))
    );
  }

  async function clearAllNotifications() {
    const ok = window.confirm("Delete all notifications?");
    if (!ok) return;

    try {
      setClearing(true);

      const res = await fetch("/api/notifications/clear", {
        method: "POST",
      });

      let data;
      try {
        data = await res.json();
      } catch {
        alert("Server error");
        return;
      }

      if (!res.ok || !data.success) {
        alert(data.message || "Failed");
        return;
      }

      setNotifications([]);
    } catch {
      alert("Network error");
    } finally {
      setClearing(false);
    }
  }

  useEffect(() => {
    if (!userId) return;
    loadNotifications();
  }, [userId]);

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative h-11 w-11 rounded-2xl border bg-white"
      >
        <Bell className="mx-auto" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 text-xs bg-red-500 text-white px-1 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white shadow-xl rounded-xl z-50">
          <div className="p-4 border-b flex justify-between">
            <b>Notifications</b>

            <div className="flex gap-2">
              <button onClick={markAllAsRead} className="text-xs">
                Read all
              </button>
              <button onClick={clearAllNotifications} className="text-xs text-red-600">
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
              notifications.map(n => {
                const Icon = getNotificationIcon(n.type);

                return (
                  <Link
                    key={n.id}
                    href={getNotificationHref(n)}
                    className={`flex gap-3 p-4 border-b ${
                      n.is_read ? "" : "bg-indigo-50"
                    }`}
                  >
                    <Icon className="w-4 h-4 mt-1" />

                    <div>
                      <div className="text-sm font-semibold">{n.title}</div>
                      {n.body && (
                        <div className="text-xs text-gray-500">
                          {n.body}
                        </div>
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

          <div className="p-3 border-t text-center">
            <Link href="/notifications">View all</Link>
          </div>
        </div>
      )}
    </div>
  );
}
