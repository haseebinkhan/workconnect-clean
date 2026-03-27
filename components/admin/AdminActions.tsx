"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export function AdminUserAction({
  adminUserId,
  targetUserId,
  isActive,
}: {
  adminUserId: string;
  targetUserId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateUser = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin/users/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminUserId,
          targetUserId,
          isActive: !isActive,
        }),
      });

      const raw = await response.text();
      let data: { error?: string; success?: boolean } = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { error: raw || "Unknown server response" };
      }

      if (!response.ok) {
        setErrorMessage(data.error || "Update failed");
        return;
      }

      setShowConfirm(false);
      router.refresh();
    } catch (error) {
      console.error("Update user error:", error);
      setErrorMessage("Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${
          isActive
            ? "bg-red-600 hover:bg-red-700"
            : "bg-emerald-600 hover:bg-emerald-700"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {loading ? "Updating..." : isActive ? "Suspend" : "Activate"}
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900">
              {isActive ? "Suspend user?" : "Activate user?"}
            </h3>

            <p className="mt-3 text-sm leading-7 text-slate-600">
              {isActive
                ? "This user will lose access to active platform features until reactivated."
                : "This user will regain access to the platform."}
            </p>

            {errorMessage ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={updateUser}
                disabled={loading}
                className={`rounded-2xl px-5 py-3 text-sm font-semibold text-white transition disabled:opacity-60 ${
                  isActive
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {loading ? "Saving..." : isActive ? "Suspend user" : "Activate user"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function AdminJobAction({
  adminUserId,
  jobId,
  currentStatus,
}: {
  adminUserId: string;
  jobId: string;
  currentStatus: string;
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<"open" | "paused" | "rejected" | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [reason, setReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isReasonRequired = pendingStatus === "paused" || pendingStatus === "rejected";

  const modalTitle = useMemo(() => {
    if (pendingStatus === "open") return "Approve job?";
    if (pendingStatus === "paused") return "Pause job?";
    if (pendingStatus === "rejected") return "Reject job?";
    return "Confirm action";
  }, [pendingStatus]);

  const helperText = useMemo(() => {
    if (pendingStatus === "open") {
      return "This will approve the job and make it live to workers.";
    }
    if (pendingStatus === "paused") {
      return "Please explain why this job is being paused. The hirer will receive this reason.";
    }
    if (pendingStatus === "rejected") {
      return "Please explain why this job is being rejected. The hirer will receive this reason.";
    }
    return "";
  }, [pendingStatus]);

  const resetModalState = () => {
    setShowConfirm(false);
    setPendingStatus(null);
    setReason("");
    setErrorMessage(null);
  };

  const askConfirm = (status: "open" | "paused" | "rejected") => {
    setPendingStatus(status);
    setReason("");
    setErrorMessage(null);
    setShowConfirm(true);
  };

  const updateStatus = async () => {
    if (!pendingStatus) return;

    if (isReasonRequired && reason.trim().length < 5) {
      setErrorMessage("Please enter a short reason of at least 5 characters.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin/update-job-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminUserId,
          jobId,
          status: pendingStatus,
          reason: reason.trim() || null,
        }),
      });

      const raw = await response.text();
      let data: { error?: string; success?: boolean } = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { error: raw || "Unknown server response" };
      }

      if (!response.ok) {
        setErrorMessage(data.error || "Update failed");
        return;
      }

      resetModalState();
      router.refresh();
    } catch (error) {
      console.error("Update job error:", error);
      setErrorMessage("Update failed");
    } finally {
      setLoading(false);
    }
  };

  const statusLabel =
    currentStatus === "pending"
      ? "Pending review"
      : currentStatus === "open"
      ? "Approved"
      : currentStatus === "paused"
      ? "Paused"
      : currentStatus === "rejected"
      ? "Rejected"
      : currentStatus === "closed"
      ? "Closed"
      : currentStatus;

  return (
    <>
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {statusLabel}
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => askConfirm("open")}
            disabled={loading || currentStatus === "open"}
            className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Approve
          </button>

          <button
            type="button"
            onClick={() => askConfirm("paused")}
            disabled={loading || currentStatus === "paused"}
            className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Pause
          </button>

          <button
            type="button"
            onClick={() => askConfirm("rejected")}
            disabled={loading || currentStatus === "rejected"}
            className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reject
          </button>
        </div>
      </div>

      {showConfirm && pendingStatus && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl">
            <h3 className="text-2xl font-bold text-slate-900">{modalTitle}</h3>

            <p className="mt-3 text-sm leading-7 text-slate-600">{helperText}</p>

            {isReasonRequired ? (
              <div className="mt-5">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={5}
                  placeholder={
                    pendingStatus === "paused"
                      ? "Explain why the job is being paused and what the hirer should fix."
                      : "Explain clearly why the job is being rejected."
                  }
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
                <p className="mt-2 text-xs text-slate-500">
                  This reason will be sent to the hirer in their notification.
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                The hirer will be notified that the job is approved and now live.
              </div>
            )}

            {errorMessage ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={resetModalState}
                disabled={loading}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={updateStatus}
                disabled={loading}
                className={`rounded-2xl px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  pendingStatus === "open"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : pendingStatus === "paused"
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {loading
                  ? "Saving..."
                  : pendingStatus === "open"
                  ? "Approve job"
                  : pendingStatus === "paused"
                  ? "Pause job"
                  : "Reject job"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}