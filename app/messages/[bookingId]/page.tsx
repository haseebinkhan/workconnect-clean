"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import DeleteChatButton from "@/components/messages/DeleteChatButton";
import { formatDateTime } from "@/lib/date-utils";

type Message = {
  id: string;
  booking_id: string;
  sender_id: string;
  receiver_id?: string | null;
  content: string;
  is_read: boolean;
  delivered?: boolean | null;
  created_at: string;
};

type BookingResponse = {
  booking?: {
    id: string;
    hirer_user_id: string;
    worker_user_id: string;
    other_user_name?: string | null;
    title?: string | null;
    status?: string | null;
    preferred_meeting_at?: string | null;
  };
  messages?: Message[];
  error?: string;
};

type TypingRow = {
  booking_id: string;
  user_id: string;
  is_typing: boolean;
};

function formatTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MessageStatus({
  isMine,
  delivered,
  isRead,
}: {
  isMine: boolean;
  delivered?: boolean | null;
  isRead: boolean;
}) {
  if (!isMine) return null;
  if (isRead) return <span>Read</span>;
  if (delivered) return <span>Delivered</span>;
  return <span>Sent</span>;
}

function statusBadgeClasses(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "accepted":
      return "bg-emerald-50 text-emerald-700";
    case "cancelled":
      return "bg-rose-50 text-rose-700";
    case "in_progress":
      return "bg-indigo-50 text-indigo-700";
    case "completed":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-amber-50 text-amber-700";
  }
}

export default function BookingMessagesPage({
  params,
}: {
  params: { bookingId: string };
}) {
  const supabase = useMemo(() => createClient(), []);
  const bookingId = params.bookingId;

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [otherUserName, setOtherUserName] = useState("Recipient");
  const [bookingTitle, setBookingTitle] = useState("Conversation");
  const [bookingStatus, setBookingStatus] = useState("pending");
  const [preferredMeetingAt, setPreferredMeetingAt] = useState<string | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isMeTyping, setIsMeTyping] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sortedMessages = useMemo(() => {
    return [...messages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [messages]);

  async function loadChat() {
    try {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user?.id) {
        setErrorMessage("Please log in again.");
        return;
      }

      const myId = user.id;
      setCurrentUserId(myId);

      const chatRes = await fetch(`/api/messages/get?bookingId=${bookingId}`, {
        cache: "no-store",
      });
      const chatRaw = await chatRes.text();
      const chatData: BookingResponse = chatRaw ? JSON.parse(chatRaw) : {};

      if (!chatRes.ok) {
        setErrorMessage(chatData.error || "Could not load chat.");
        return;
      }

      setMessages(chatData.messages || []);

      if (chatData.booking) {
        setOtherUserName(chatData.booking.other_user_name || "Recipient");
        setBookingTitle(chatData.booking.title || "Conversation");
        setBookingStatus(chatData.booking.status || "pending");
        setPreferredMeetingAt(chatData.booking.preferred_meeting_at || null);
      }

      await fetch("/api/messages/delivered", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      await fetch("/api/messages/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
    } catch (error) {
      console.error("load chat error:", error);
      setErrorMessage("Could not load chat.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmed = messageText.trim();
    if (!trimmed) return;

    try {
      setSending(true);
      setErrorMessage("");

      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId,
          content: trimmed,
        }),
      });

      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : {};

      if (!res.ok) {
        setErrorMessage(data?.error || "Could not send message.");
        return;
      }

      if (data?.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }

      setMessageText("");
      setIsMeTyping(false);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      await fetch("/api/messages/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, isTyping: false }),
      });
    } catch (error) {
      console.error("send message error:", error);
      setErrorMessage("Could not send message.");
    } finally {
      setSending(false);
    }
  }

  async function handleInputChange(value: string) {
    setMessageText(value);

    if (!value.trim()) {
      setIsMeTyping(false);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      await fetch("/api/messages/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, isTyping: false }),
      });

      return;
    }

    setIsMeTyping(true);

    await fetch("/api/messages/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, isTyping: true }),
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(async () => {
      setIsMeTyping(false);

      await fetch("/api/messages/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, isTyping: false }),
      });
    }, 1500);
  }

  useEffect(() => {
    void loadChat();
  }, [bookingId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sortedMessages.length, otherTyping]);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`messages-booking-${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `booking_id=eq.${bookingId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });

          if (newMessage.sender_id !== currentUserId) {
            await fetch("/api/messages/delivered", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bookingId }),
            });

            await fetch("/api/messages/mark-read", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bookingId }),
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) =>
            prev.map((msg) => (msg.id === updated.id ? { ...msg, ...updated } : msg))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "booking_typing",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          const row = payload.new as TypingRow;
          if (!row) return;
          if (row.user_id === currentUserId) return;
          setOtherTyping(!!row.is_typing);
        }
      )
      .subscribe();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      void fetch("/api/messages/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, isTyping: false }),
      });

      supabase.removeChannel(channel);
    };
  }, [bookingId, supabase, currentUserId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8">
        <section className="mx-auto max-w-4xl">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-slate-500">Loading chat...</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">{bookingTitle}</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              {otherUserName || "Recipient"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">Live conversation for this booking</p>
          </div>

          <div className="flex gap-3">
            <DeleteChatButton bookingId={bookingId} variant="page" />
            <Link
              href="/messages"
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Back to messages
            </Link>
          </div>
        </div>

        <div className="mb-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900">{bookingTitle}</h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusBadgeClasses(
                bookingStatus
              )}`}
            >
              {bookingStatus}
            </span>
          </div>

          {preferredMeetingAt ? (
            <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
                Meeting time
              </p>
              <p className="mt-1 text-sm font-semibold text-indigo-900">
                {formatDateTime(preferredMeetingAt)}
              </p>
            </div>
          ) : null}
        </div>

        <section className="rounded-[2rem] border border-slate-200 bg-slate-50 p-4 shadow-sm sm:p-6">
          <div className="max-h-[65vh] overflow-y-auto rounded-[1.5rem] border border-slate-200 bg-white p-4 sm:p-6">
            {errorMessage ? (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            {sortedMessages.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">
                No messages yet. Start the conversation.
              </div>
            ) : (
              sortedMessages.map((message) => {
                const isMine = message.sender_id === currentUserId;

                return (
                  <div
                    key={message.id}
                    className={`mb-4 flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                        isMine
                          ? "bg-indigo-600 text-white"
                          : "border border-slate-200 bg-white text-slate-900"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words text-sm leading-7">
                        {message.content}
                      </p>

                      <div
                        className={`mt-2 flex items-center justify-end gap-2 text-[11px] ${
                          isMine ? "text-indigo-100" : "text-slate-400"
                        }`}
                      >
                        <span>{formatTime(message.created_at)}</span>
                        <MessageStatus
                          isMine={isMine}
                          delivered={message.delivered}
                          isRead={message.is_read}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {otherTyping ? (
              <div className="mt-2 text-xs text-slate-500">
                {otherUserName || "Recipient"} is typing...
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>

          <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
            <form onSubmit={handleSend} className="flex flex-col gap-3">
              <div className="flex items-end gap-3">
                <textarea
                  rows={3}
                  value={messageText}
                  onChange={(e) => void handleInputChange(e.target.value)}
                  placeholder={`Write a message to ${otherUserName || "recipient"}...`}
                  className="w-full resize-none rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
                />

                <button
                  type="submit"
                  disabled={sending || !messageText.trim()}
                  className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>

              <div className="flex min-h-[20px] items-center justify-between text-xs text-slate-400">
                <span>{isMeTyping ? "Typing..." : ""}</span>
                <span>{otherUserName || "Recipient"}</span>
              </div>
            </form>
          </div>
        </section>
      </section>
    </main>
  );
}