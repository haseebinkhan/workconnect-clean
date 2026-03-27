"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BookingStatusActionsProps = {
  bookingId: string;
  currentStatus: string;
  role: "worker" | "hirer";
};

export default function BookingStatusActions({
  bookingId,
  currentStatus,
  role,
}: BookingStatusActionsProps) {
  const router = useRouter();
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  const [error, setError] = useState("");

  const actions = getActions(currentStatus, role);

  async function handleAction(nextStatus: string) {
    const confirmed = window.confirm(
      `Are you sure you want to change this booking to "${nextStatus}"?`
    );

    if (!confirmed) return;

    try {
      setLoadingStatus(nextStatus);
      setError("");

      const res = await fetch("/api/bookings/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId,
          nextStatus,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Could not update booking.");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update booking.");
    } finally {
      setLoadingStatus(null);
    }
  }

  if (actions.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        No actions available for this booking state.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {actions.map((action) => (
        <button
          key={action.nextStatus}
          type="button"
          onClick={() => handleAction(action.nextStatus)}
          disabled={loadingStatus !== null}
          className={action.className}
        >
          {loadingStatus === action.nextStatus ? action.loadingLabel : action.label}
        </button>
      ))}
    </div>
  );
}

function getActions(currentStatus: string, role: "worker" | "hirer") {
  if (role === "worker") {
    if (currentStatus === "pending") {
      return [
        {
          nextStatus: "accepted",
          label: "Accept request",
          loadingLabel: "Accepting...",
          className:
            "w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60",
        },
        {
          nextStatus: "cancelled",
          label: "Decline request",
          loadingLabel: "Declining...",
          className:
            "w-full rounded-2xl border border-red-300 bg-white px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60",
        },
      ];
    }

    if (currentStatus === "accepted") {
      return [
        {
          nextStatus: "in_progress",
          label: "Start work",
          loadingLabel: "Starting...",
          className:
            "w-full rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60",
        },
        {
          nextStatus: "cancelled",
          label: "Cancel booking",
          loadingLabel: "Cancelling...",
          className:
            "w-full rounded-2xl border border-red-300 bg-white px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60",
        },
      ];
    }

    if (currentStatus === "in_progress") {
      return [
        {
          nextStatus: "worker_marked_done",
          label: "Mark as done",
          loadingLabel: "Updating...",
          className:
            "w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60",
        },
      ];
    }
  }

  if (role === "hirer") {
    if (currentStatus === "worker_marked_done") {
      return [
        {
          nextStatus: "completed",
          label: "Confirm completion",
          loadingLabel: "Confirming...",
          className:
            "w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60",
        },
      ];
    }

    if (currentStatus === "pending" || currentStatus === "accepted") {
      return [
        {
          nextStatus: "cancelled",
          label: "Cancel booking",
          loadingLabel: "Cancelling...",
          className:
            "w-full rounded-2xl border border-red-300 bg-white px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60",
        },
      ];
    }
  }

  return [];
}
