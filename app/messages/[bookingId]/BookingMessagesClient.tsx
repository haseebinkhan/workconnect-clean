"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type BookingMessagesClientProps = {
  bookingId: string;
  currentUserId: string;
  initialBooking: {
    id: string;
    title: string | null;
    message: string | null;
    status: string | null;
    budget_amount: number | null;
    currency_code: string | null;
    country: string | null;
    region: string | null;
    city: string | null;
    postcode: string | null;
    area_slug: string | null;
    preferred_meeting_at: string | null;
    hirer_user_id: string;
    worker_user_id: string;
    created_at: string | null;
  };
  initialMessages: Array<{
    id: string;
    booking_id: string;
    sender_id?: string | null;
    sender_user_id?: string | null;
    receiver_id?: string | null;
    receiver_user_id?: string | null;
    content: string | null;
    created_at: string | null;
    is_read?: boolean | null;
    delivered?: boolean | null;
    message_type?: string | null;
  }>;
  initialParticipants?: {
    hirer?: {
      id: string;
      full_name: string | null;
      email?: string | null;
    } | null;
    worker?: {
      id: string;
      full_name: string | null;
      email?: string | null;
    } | null;
  };
};

type ThreadMessage = {
  id: string;
  booking_id: string;
  sender_id: string | null;
  receiver_id: string | null;
  content: string;
  created_at: string | null;
  is_read: boolean;
  delivered: boolean;
  message_type: string | null;
};

function formatDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLocation({
  country,
  region,
  city,
  postcode,
  areaSlug,
}: {
  country?: string | null;
  region?: string | null;
  city?: string | null;
  postcode?: string | null;
  areaSlug?: string | null;
}) {
  const parts = [city, region, country].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  if (postcode) return postcode;
  if (areaSlug) return areaSlug;
  return "Not specified";
}

function statusClasses(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "accepted":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "cancelled":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "in_progress":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "worker_marked_done":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "completed":
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

function normalizeMessage(item: any): ThreadMessage {
  return {
    id: item.id,
    booking_id: item.booking_id,
    sender_id: item.sender_id ?? item.sender_user_id ?? null,
    receiver_id: item.receiver_id ?? item.receiver_user_id ?? null,
    content: item.content ?? "",
    created_at: item.created_at ?? null,
    is_read: Boolean(item.is_read),
    delivered: Boolean(item.delivered),
    message_type: item.message_type ?? null,
  };
}

export default function BookingMessagesClient({
  bookingId,
  currentUserId,
  initialBooking,
  initialMessages,
  initialParticipants,
}: BookingMessagesClientProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [booking, setBooking] = useState(initialBooking);
  const [messages, setMessages] = useState<ThreadMessage[]>(
    (initialMessages || []).map(normalizeMessage)
  );
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [working, setWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [participants, setParticipants] = useState(initialParticipants || {});

  const isWorker = booking.worker_user_id === currentUserId;
  const isHirer = booking.hirer_user_id === currentUserId;

  const otherPerson = isWorker ? participants.hirer : participants.worker;

  const requestLocation = useMemo(
    () =>
      formatLocation({
        country: booking.country,
        region: booking.region,
        city: booking.city,
        postcode: booking.postcode,
        areaSlug: booking.area_slug,
      }),
    [booking.country, booking.region, booking.city, booking.postcode, booking.area_slug]
  );

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    markDelivered();
    markRead();

    const interval = setInterval(() => {
      refreshThread();
    }, 7000);

    return () => clearInterval(interval);
  }, [bookingId]);

  async function refreshThread() {
    try {
      const response = await fetch("/api/messages/get", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookingId }),
      });

      const result = await response.json();

      if (!response.ok) return;

      if (Array.isArray(result.messages)) {
        setMessages(result.messages.map(normalizeMessage));
      }

      if (result.booking) {
        setBooking((prev) => ({
          ...prev,
          ...result.booking,
        }));
      }

      if (result.participants) {
        setParticipants(result.participants);
      }

      await markDelivered();
      await markRead();
    } catch (error) {
      console.error("refresh thread error:", error);
    }
  }

  async function markDelivered() {
    try {
      await fetch("/api/messages/delivered", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookingId }),
      });
    } catch (error) {
      console.error("mark delivered error:", error);
    }
  }

  async function markRead() {
    try {
      await fetch("/api/messages/read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookingId }),
      });
    } catch (error) {
      console.error("mark read error:", error);
    }
  }

  async function handleSendMessage() {
    const cleanDraft = draft.trim();

    if (!cleanDraft) {
      setErrorMessage("Please enter a message.");
      return;
    }

    try {
      setSending(true);
      setErrorMessage("");

      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId,
          content: cleanDraft,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setErrorMessage(result?.error || "Could not send message.");
        return;
      }

      setDraft("");
      await refreshThread();
    } catch (error) {
      console.error("send message error:", error);
      setErrorMessage("Could not send message.");
    } finally {
      setSending(false);
    }
  }

  async function handleRequestAction(action: string) {
    try {
      setWorking(true);
      setErrorMessage("");

      const isProgressAction =
        action === "start_work" ||
        action === "mark_done" ||
        action === "complete_work" ||
        action === "cancel_request";

      const endpoint = isProgressAction
        ? "/api/bookings/progress"
        : "/api/bookings/update-status";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId,
          action,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setErrorMessage(result?.error || "Could not update request.");
        return;
      }

      setBooking((prev) => ({
        ...prev,
        status: result.status || prev.status,
      }));

      await refreshThread();
      router.refresh();
    } catch (error) {
      console.error("request action error:", error);
      setErrorMessage("Could not update request.");
    } finally {
      setWorking(false);
    }
  }

  const canAccept = isWorker && booking.status === "pending";
  const canWorkerCancel =
    isWorker &&
    booking.status !== "completed" &&
    booking.status !== "cancelled";
  const canHirerCancel =
    isHirer &&
    booking.status !== "completed" &&
    booking.status !== "cancelled";
  const canStartWork = isHirer && booking.status === "accepted";
  const canMarkDone = isWorker && booking.status === "in_progress";
  const canComplete = isHirer && booking.status === "worker_marked_done";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[360px,minmax(0,1fr)]">
          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">Request thread</p>
                  <h1 className="mt-2 text-2xl font-bold text-slate-900">
                    {booking.title || "Request"}
                  </h1>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusClasses(
                    booking.status
                  )}`}
                >
                  {booking.status || "pending"}
                </span>
              </div>

              <div className="mt-5 space-y-3 text-sm text-slate-700">
                <p>
                  <span className="font-semibold text-slate-900">With:</span>{" "}
                  {otherPerson?.full_name || "Other participant"}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Location:</span>{" "}
                  {requestLocation}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Meeting time:</span>{" "}
                  {booking.preferred_meeting_at
                    ? formatDateTime(booking.preferred_meeting_at)
                    : "Not specified"}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Budget:</span>{" "}
                  {booking.budget_amount != null
                    ? `${booking.currency_code || "GBP"} ${booking.budget_amount}`
                    : "Not specified"}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Created:</span>{" "}
                  {formatDateTime(booking.created_at)}
                </p>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  Original request
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                  {booking.message || "No original request message."}
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Actions</h2>

              {errorMessage ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <div className="mt-5 grid gap-3">
                {canAccept ? (
                  <button
                    type="button"
                    onClick={() => handleRequestAction("accepted")}
                    disabled={working}
                    className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Accept request
                  </button>
                ) : null}

                {canStartWork ? (
                  <button
                    type="button"
                    onClick={() => handleRequestAction("start_work")}
                    disabled={working}
                    className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                  >
                    Start work
                  </button>
                ) : null}

                {canMarkDone ? (
                  <button
                    type="button"
                    onClick={() => handleRequestAction("mark_done")}
                    disabled={working}
                    className="rounded-2xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
                  >
                    Mark work done
                  </button>
                ) : null}

                {canComplete ? (
                  <button
                    type="button"
                    onClick={() => handleRequestAction("complete_work")}
                    disabled={working}
                    className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    Complete booking
                  </button>
                ) : null}

                {canWorkerCancel || canHirerCancel ? (
                  <button
                    type="button"
                    onClick={() => handleRequestAction("cancel_request")}
                    disabled={working}
                    className="rounded-2xl border border-rose-300 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                  >
                    Cancel request
                  </button>
                ) : null}
              </div>

              <div className="mt-5">
                <Link
                  href="/messages"
                  className="inline-flex rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                >
                  Back to all messages
                </Link>
              </div>
            </div>
          </aside>

          <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5 sm:px-8">
              <h2 className="text-xl font-bold text-slate-900">Conversation</h2>
              <p className="mt-1 text-sm text-slate-600">
                Discuss details, timings, and next steps here.
              </p>
            </div>

            <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-6 sm:px-8">
              {messages.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-600">
                  No messages yet.
                </div>
              ) : (
                messages.map((message) => {
                  const mine = message.sender_id === currentUserId;

                  return (
                    <div
                      key={message.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-[1.5rem] px-4 py-3 shadow-sm ${
                          mine
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-900"
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-7">
                          {message.content || ""}
                        </p>
                        <div
                          className={`mt-2 flex items-center justify-end gap-2 text-xs ${
                            mine ? "text-indigo-100" : "text-slate-500"
                          }`}
                        >
                          <span>{formatDateTime(message.created_at)}</span>
                          {mine ? (
                            <span>
                              {message.is_read
                                ? "Read"
                                : message.delivered
                                ? "Delivered"
                                : "Sent"}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={scrollRef} />
            </div>

            <div className="border-t border-slate-200 px-6 py-5 sm:px-8">
              <div className="space-y-4">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={4}
                  placeholder="Write your message..."
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500"
                />

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={sending}
                    className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {sending ? "Sending..." : "Send message"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}