"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ChatMessage = {
  id: string;
  bookingId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  delivered: boolean;
  createdAt: string;
  isMine: boolean;
};

type ChatThreadPanelProps = {
  bookingId: string;
  currentUserId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserSubtitle: string;
  otherUserOnline: boolean;
  otherUserLastSeen: string;
  initialMessages: ChatMessage[];
};

type MessageRow = {
  id: string;
  booking_id: string;
  sender_id: string;
  content: string;
  is_read?: boolean | null;
  delivered?: boolean | null;
  created_at?: string | null;
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
  delivered: boolean;
  isRead: boolean;
}) {
  if (!isMine) return null;

  if (isRead) {
    return (
      <span className="inline-flex items-center gap-0.5" aria-label="Read">
        <span>✓</span>
        <span>✓</span>
      </span>
    );
  }

  if (delivered) {
    return (
      <span
        className="inline-flex items-center gap-0.5 opacity-90"
        aria-label="Delivered"
      >
        <span>✓</span>
        <span>✓</span>
      </span>
    );
  }

  return <span aria-label="Sent">✓</span>;
}

export default function ChatThreadPanel({
  bookingId,
  currentUserId,
  otherUserId,
  otherUserName,
  otherUserSubtitle,
  otherUserOnline,
  otherUserLastSeen,
  initialMessages,
}: ChatThreadPanelProps) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [isMeTyping, setIsMeTyping] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = (smooth = true) => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, []);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat-booking-${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          const newMessage = payload.new as MessageRow;

          setMessages((prev) => {
            const exists = prev.some((item) => item.id === newMessage.id);
            if (exists) return prev;

            return [
              ...prev,
              {
                id: newMessage.id,
                bookingId: newMessage.booking_id,
                senderId: newMessage.sender_id,
                content: newMessage.content,
                isRead: !!newMessage.is_read,
                delivered: !!newMessage.delivered,
                createdAt: newMessage.created_at || new Date().toISOString(),
                isMine: newMessage.sender_id === currentUserId,
              },
            ];
          });

          if (newMessage.sender_id !== currentUserId) {
            void fetch("/api/messages/mark-read", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
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
          const updated = payload.new as MessageRow;

          setMessages((prev) =>
            prev.map((message) =>
              message.id === updated.id
                ? {
                    ...message,
                    isRead: !!updated.is_read,
                    delivered: !!updated.delivered,
                  }
                : message
            )
          );
        }
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.userId === otherUserId) {
          setIsOtherTyping(!!payload?.isTyping);

          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }

          typingTimeoutRef.current = setTimeout(() => {
            setIsOtherTyping(false);
          }, 1800);
        }
      })
      .subscribe();

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (stopTypingTimeoutRef.current)
        clearTimeout(stopTypingTimeoutRef.current);
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
      void supabase.removeChannel(channel);
    };
  }, [bookingId, currentUserId, otherUserId, supabase]);

  const sendTyping = async (isTyping: boolean) => {
    await supabase.channel(`chat-booking-${bookingId}`).send({
      type: "broadcast",
      event: "typing",
      payload: {
        bookingId,
        userId: currentUserId,
        isTyping,
      },
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessageText(value);

    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
    }

    typingDebounceRef.current = setTimeout(() => {
      const shouldType = value.trim().length > 0;
      setIsMeTyping(shouldType);
      void sendTyping(shouldType);
    }, 300);

    if (stopTypingTimeoutRef.current) {
      clearTimeout(stopTypingTimeoutRef.current);
    }

    stopTypingTimeoutRef.current = setTimeout(() => {
      setIsMeTyping(false);
      void sendTyping(false);
    }, 1200);
  };

  const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmed = messageText.trim();
    if (!trimmed) return;

    setSending(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId,
          content: trimmed,
        }),
      });

      const raw = await response.text();
      let data: { error?: string } = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { error: raw || "Unknown server response" };
      }

      if (!response.ok) {
        setErrorMessage(data.error || "Could not send message");
        return;
      }

      setMessageText("");
      setIsMeTyping(false);
      await sendTyping(false);
    } catch (error) {
      console.error("Send message failed:", error);
      setErrorMessage("Could not send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <section className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 text-base font-semibold text-white">
            {otherUserName.charAt(0).toUpperCase()}
            {otherUserOnline && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
            )}
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-slate-900">
              {otherUserName}
            </h1>
            <p className="truncate text-sm text-slate-500">
              {isOtherTyping
                ? "Typing..."
                : otherUserOnline
                  ? "Online"
                  : `${otherUserSubtitle} • ${otherUserLastSeen}`}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6">
        <div className="flex-1 space-y-3">
          {messages.length === 0 ? (
            <div className="flex h-[50vh] items-center justify-center rounded-[2rem] border border-slate-200 bg-white text-slate-500 shadow-sm">
              No messages yet
            </div>
          ) : (
            messages.map((message, index) => {
              const previous = messages[index - 1];
              const showSpacing =
                !previous || previous.senderId !== message.senderId;

              return (
                <div
                  key={message.id}
                  className={`flex ${message.isMine ? "justify-end" : "justify-start"} ${
                    showSpacing ? "pt-2" : "pt-0.5"
                  }`}
                >
                  <div
                    className={`max-w-[82%] rounded-3xl px-4 py-3 shadow-sm ${
                      message.isMine
                        ? "bg-indigo-600 text-white"
                        : "border border-slate-200 bg-white text-slate-900"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm leading-7">
                      {message.content}
                    </p>

                    <div
                      className={`mt-2 flex items-center justify-end gap-2 text-[11px] ${
                        message.isMine ? "text-indigo-100" : "text-slate-400"
                      }`}
                    >
                      <span>{formatTime(message.createdAt)}</span>
                      <MessageStatus
                        isMine={message.isMine}
                        delivered={message.delivered}
                        isRead={message.isRead}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}

          <div ref={bottomRef} />
        </div>

        <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
          {errorMessage && (
            <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSend} className="flex flex-col gap-3">
            <div className="flex items-end gap-3">
              <textarea
                rows={3}
                value={messageText}
                onChange={handleInputChange}
                placeholder="Write a message..."
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
              <span>Live chat</span>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}