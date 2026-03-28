"use client";

import { useMemo, useState } from "react";

type JobApplicationActionsProps = {
  applicationId: string;
  currentStatus: string;
};

type UpdateResponse = {
  success?: boolean;
  error?: string;
  bookingId?: string;
  message?: string;
};

export default function JobApplicationActions({
  applicationId,
  currentStatus,
}: JobApplicationActionsProps) {
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<"accepted" | "rejected" | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const normalizedStatus = useMemo(
    () => (currentStatus || "").toLowerCase(),
    [currentStatus]
  );

  const openConfirm = (action: "accepted" | "rejected") => {
    if (normalizedStatus !== "pending") return;
    setPendingAction(action);
    setErrorMessage("");
    setSuccessMessage("");
    setShowConfirm(true);
  };

  const closeConfirm = () => {
    if (loading) return;
    setShowConfirm(false);
    setPendingAction(null);
  };

  const handleUpdate = async () => {
    if (!pendingAction) return;

    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch("/api/jobs/applications/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicationId,
          action: pendingAction,
        }),
      });

      const raw = await response.text();
      let result: UpdateResponse = {};

      try {
        result = raw ? (JSON.parse(raw) as UpdateResponse) : {};
      } catch {
        result = { error: raw || "Could not update application" };
      }

      if (!response.ok) {
        setErrorMessage(result.error || "Could not update application");
        return;
      }

      if (pendingAction === "accepted") {
        setSuccessMessage("Application accepted successfully.");

        if (result.bookingId) {
          window.location.href = `/messages/${result.bookingId}`;
          return;
        }

        window.location.reload();
        return;
      }

      setSuccessMessage("Application rejected successfully.");
      window.location.reload();
    } catch (error) {
      console.error("Application status update failed:", error);
      setErrorMessage("Could not update application");
    } finally {
      setLoading(false);
      setShowConfirm(false);
      setPendingAction(null);
    }
  };

  if (normalizedStatus === "accepted") {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700">
          Accepted
        </div>

        <div className="grid gap-3">
          <a
            href="/my-requests"
            className="rounded-2xl border border-emerald-300 bg-white px-4 py-3 text-center text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
          >
            View requests
          </a>
          <a
            href="/messages"
            className="rounded-2xl bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Open messages
          </a>
        </div>
      </div>
    );
  }

  if (normalizedStatus === "rejected") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700">
        Rejected
      </div>
    );
  }

  if (normalizedStatus !== "pending") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        This application is already <span className="font-semibold">{currentStatus}</span>.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        <div className="flex gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => openConfirm("accepted")}
            className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && pendingAction === "accepted" ? "Updating..." : "Accept"}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => openConfirm("rejected")}
            className="flex-1 rounded-2xl border border-red-300 bg-white px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && pendingAction === "rejected" ? "Updating..." : "Reject"}
          </button>
        </div>
      </div>

      {showConfirm && pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              {pendingAction === "accepted" ? "Accept application" : "Reject application"}
            </h3>

            <p className="mt-3 text-sm leading-7 text-slate-600">
              {pendingAction === "accepted"
                ? "Accepting this application will create a booking, start the conversation, close the job, and reject other pending applicants."
                : "Rejecting this application will notify the worker and mark this application as rejected."}
            </p>

            {pendingAction === "accepted" ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                After acceptance, you will be taken to the chat if a booking is created successfully.
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                This action will remove this worker from the active review list for this job.
              </div>
            )}

            {errorMessage ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeConfirm}
                disabled={loading}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleUpdate}
                disabled={loading}
                className={`rounded-2xl px-5 py-3 text-sm font-semibold text-white transition disabled:opacity-60 ${
                  pendingAction === "accepted"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {loading
                  ? pendingAction === "accepted"
                    ? "Accepting..."
                    : "Rejecting..."
                  : pendingAction === "accepted"
                  ? "Confirm accept"
                  : "Confirm reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
