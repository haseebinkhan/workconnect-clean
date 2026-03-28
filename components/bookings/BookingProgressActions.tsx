"use client";

import { useState } from "react";

type Props = {
  bookingId: string;
  currentStatus: string;
  role: "hirer" | "worker";
};

export default function BookingProgressActions({
  bookingId,
  currentStatus,
  role,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function runAction(action: string) {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch("/api/bookings/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId,
          action,
        }),
      });

      const raw = await response.text();
      const data = raw ? JSON.parse(raw) : {};

      if (!response.ok) {
        setErrorMessage(data?.error || "Could not update booking.");
        return;
      }

      window.location.reload();
    } catch (error) {
      console.error("booking progress error:", error);
      setErrorMessage("Could not update booking.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {role === "hirer" && currentStatus === "accepted" ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => runAction("start_work")}
          className="w-full rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? "Updating..." : "Start work"}
        </button>
      ) : null}

      {role === "worker" && currentStatus === "in_progress" ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => runAction("mark_done")}
          className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading ? "Updating..." : "Mark work as done"}
        </button>
      ) : null}

      {role === "hirer" && currentStatus === "worker_marked_done" ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => runAction("complete_work")}
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? "Updating..." : "Complete booking"}
        </button>
      ) : null}

      {currentStatus !== "completed" && currentStatus !== "cancelled" ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => runAction("cancel_request")}
          className="w-full rounded-2xl border border-red-300 bg-white px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
        >
          {loading ? "Updating..." : "Cancel"}
        </button>
      ) : null}

      {currentStatus === "completed" ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700">
          Completed
        </div>
      ) : null}

      {currentStatus === "cancelled" ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700">
          Cancelled
        </div>
      ) : null}
    </div>
  );
}
