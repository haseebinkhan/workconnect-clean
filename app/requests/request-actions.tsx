"use client";

import { useState } from "react";

export default function RequestActions({
  bookingId,
  currentStatus,
}: {
  bookingId: string;
  currentStatus: string;
}) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  async function updateStatus(action: "accepted" | "cancelled") {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch("/api/bookings/update-status", {
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
        setErrorMessage(data?.error || "Could not update request.");
        return;
      }

      window.location.reload();
    } catch (error) {
      console.error("worker request update error:", error);
      setErrorMessage("Could not update request.");
    } finally {
      setLoading(false);
      setShowAcceptConfirm(false);
      setShowCancelConfirm(false);
    }
  }

  if (currentStatus === "accepted") {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700">
          Accepted
        </div>

        <button
          type="button"
          onClick={() => setShowCancelConfirm(true)}
          className="w-full rounded-2xl border border-red-300 bg-white px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
        >
          Cancel request
        </button>

        {showCancelConfirm ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">
              Cancel this accepted request?
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => updateStatus("cancelled")}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
              >
                {loading ? "Cancelling..." : "Confirm"}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}
      </div>
    );
  }

  if (currentStatus === "cancelled") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700">
        Cancelled
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <button
        type="button"
        disabled={loading}
        onClick={() => setShowAcceptConfirm(true)}
        className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        Accept
      </button>

      <button
        type="button"
        disabled={loading}
        onClick={() => setShowCancelConfirm(true)}
        className="w-full rounded-2xl border border-red-300 bg-white px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
      >
        Decline
      </button>

      {showAcceptConfirm ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-800">
            Accept this request and unlock the next stage of contact?
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => updateStatus("accepted")}
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            >
              {loading ? "Accepting..." : "Confirm"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowAcceptConfirm(false)}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {showCancelConfirm ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">Decline this request?</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => updateStatus("cancelled")}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
            >
              {loading ? "Declining..." : "Confirm"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowCancelConfirm(false)}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

