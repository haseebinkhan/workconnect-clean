"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ChatRow = {
  otherUserId: string;
  fullName: string;
  smallInfo: string;
  profileHref: string;
  isOnline: boolean;
  lastSeenLabel: string;
  previewContent: string;
  previewCreatedAt: string;
  previewDateLabel: string;
  unreadCount: number;
  latestBookingId: string;
  canContactWorker: boolean;
};

export default function MessagesPageClient({
  initialChats,
}: {
  initialChats: ChatRow[];
}) {
  const router = useRouter();
  const [chats, setChats] = useState(initialChats);

  if (!chats.length) {
    return (
      <div className="flex h-[70vh] items-center justify-center text-slate-500">
        No conversations yet
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-semibold">Messages</h1>

      <div className="space-y-3">
        {chats.map((chat) => (
          <div
            key={chat.otherUserId}
            onClick={() =>
              router.push(`/messages/${chat.latestBookingId}`)
            }
            className="flex cursor-pointer items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:shadow-md"
          >
            {/* Avatar */}
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-lg font-semibold text-white">
                {chat.fullName.charAt(0).toUpperCase()}
              </div>

              {chat.isOnline && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800">
                  {chat.fullName}
                </h2>

                <span className="text-xs text-slate-400">
                  {chat.previewDateLabel}
                </span>
              </div>

              <p className="text-xs text-slate-500">
                {chat.smallInfo}
              </p>

              <p className="mt-1 truncate text-sm text-slate-600">
                {chat.previewContent}
              </p>
            </div>

            {/* Unread */}
            {chat.unreadCount > 0 && (
              <div className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-indigo-600 px-2 text-xs font-semibold text-white">
                {chat.unreadCount}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
