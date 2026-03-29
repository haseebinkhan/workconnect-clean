"use client";

import { useState } from "react";

export default function HirerRequestActions({
  bookingId,
  currentStatus,
}: {
  bookingId: string;
  currentStatus: string;
}) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  async function cancelRequest() {
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
          action: "cancelled",
        }),
      });

      const raw = await response.text();
      const data = raw ? JSON.parse(raw) : {};

      if (!response.ok) {
        setErrorMessage(data?.error || "Could not cancel request.");
        return;
      }

      window.location.reload();
    } catch (error) {
      console.error("hirer request cancel error:", error);
      setErrorMessage("Could not cancel request.");
    } finally {
      setLoading(false);
      setShowCancelConfirm(false);
    }
  }

  if (currentStatus === "cancelled") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700">
        Cancelled
      </div>
    );
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
                onClick={cancelRequest}
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

  return (
    <div className="space-y-3">
      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-700">
        Waiting for worker response
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
          <p className="text-sm text-red-800">Cancel this pending request?</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={cancelRequest}
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
    </div>
  );
}

