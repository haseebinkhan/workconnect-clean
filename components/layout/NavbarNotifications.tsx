"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type NotificationItem = {
  id: string;
  type: "message" | "application" | "request";
  title: string;
  subtitle: string;
  href: string;
  createdAt: string;
};

function formatWhen(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NavbarNotifications({
  userId,
}: {
  userId: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  async function loadCount() {
    try {
      const res = await fetch("/api/notifications/count", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();

      if (!res.ok) return;

      setTotal(typeof data?.total === "number" ? data.total : 0);
    } catch (error) {
      console.error("Load notification count error:", error);
    }
  }

  async function loadList() {
    try {
      setLoading(true);

      const res = await fetch("/api/notifications/list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();

      if (!res.ok) return;

      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotal(typeof data?.total === "number" ? data.total : 0);
    } catch (error) {
      console.error("Load notifications error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function markSeenFromList(nextItems: NotificationItem[]) {
    try {
      const hasRequests = nextItems.some((item) => item.type === "request");
      const hasApplications = nextItems.some((item) => item.type === "application");
      const hasMessages = nextItems.some((item) => item.type === "message");

      if (hasRequests) {
        await fetch("/api/notifications/mark-seen", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId, target: "requests" }),
        });
      }

      if (hasApplications) {
        await fetch("/api/notifications/mark-seen", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId, target: "applications" }),
        });
      }

      if (hasMessages || hasApplications) {
        await fetch("/api/notifications/read", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            target: hasMessages ? "messages" : "applications",
          }),
        });
      }

      await loadCount();
    } catch (error) {
      console.error("Mark notifications seen error:", error);
    }
  }

  async function handleToggle() {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (nextOpen) {
      await loadList();
    }
  }

  useEffect(() => {
    loadCount();

    const interval = setInterval(() => {
      loadCount();
    }, 15000);

    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!open || items.length === 0) return;
    markSeenFromList(items);
  }, [open, items]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
        aria-label="Notifications"
      >
        <span className="text-lg">??</span>

        {total > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] font-bold text-white">
            {total > 99 ? "99+" : total}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-3 w-[calc(100vw-1.5rem)] max-w-[26rem] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl sm:w-[24rem]">
          <div className="border-b border-slate-200 px-4 py-4">
            <h3 className="text-base font-bold text-slate-900">Notifications</h3>
            <p className="mt-1 text-sm text-slate-500">
              Messages, requests and applications
            </p>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="p-4 text-sm text-slate-500">Loading...</div>
            ) : items.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                No notifications yet
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {items.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-4 transition hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {item.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                          {item.subtitle}
                        </p>
                      </div>
                      <p className="shrink-0 text-xs text-slate-400">
                        {formatWhen(item.createdAt)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 px-4 py-3">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-sm font-semibold text-slate-700 hover:text-slate-900"
            >
              View all notifications
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

