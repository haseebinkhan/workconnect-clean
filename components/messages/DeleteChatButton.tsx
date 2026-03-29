"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteChatButton({
  bookingId,
  variant = "card",
}: {
  bookingId: string;
  variant?: "card" | "page";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleDelete() {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch("/api/messages/delete-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookingId }),
      });

      const raw = await response.text();
      const data = raw ? JSON.parse(raw) : {};

      if (!response.ok) {
        setErrorMessage(data?.error || "Could not delete chat.");
        return;
      }

      setShowConfirm(false);
      router.push("/messages");
      router.refresh();
    } catch (error) {
      console.error("delete chat failed:", error);
      setErrorMessage("Could not delete chat.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErrorMessage("");
          setShowConfirm(true);
        }}
        className={
          variant === "page"
            ? "rounded-2xl border border-red-300 bg-white px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
            : "rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
        }
      >
        Delete chat
      </button>

      {showConfirm ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900">Delete this chat?</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              This removes the conversation from your view only. The other user
              will still keep their copy.
            </p>

            {errorMessage ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => !loading && setShowConfirm(false)}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Deleting..." : "Delete chat"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

