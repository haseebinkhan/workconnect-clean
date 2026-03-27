"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type JobApplicationActionsProps = {
  applicationId: string;
  currentStatus: string;
};

export default function JobApplicationActions({
  applicationId,
  currentStatus,
}: JobApplicationActionsProps) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<"accepted" | "rejected" | null>(null);
  const [error, setError] = useState("");

  async function handleAction(action: "accepted" | "rejected") {
    if (currentStatus !== "pending") return;

    const confirmed =
      action === "accepted"
        ? window.confirm("Accept this applicant? This will create a booking and close the job.")
        : window.confirm("Reject this applicant?");

    if (!confirmed) return;

    try {
      setLoadingAction(action);
      setError("");

      const res = await fetch("/api/jobs/applications/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicationId,
          action,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Could not update application.");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update application.");
    } finally {
      setLoadingAction(null);
    }
  }

  if (currentStatus !== "pending") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        This application is already <span className="font-semibold">{currentStatus}</span>.
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

      <button
        type="button"
        onClick={() => handleAction("accepted")}
        disabled={loadingAction !== null}
        className="w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loadingAction === "accepted" ? "Accepting..." : "Accept"}
      </button>

      <button
        type="button"
        onClick={() => handleAction("rejected")}
        disabled={loadingAction !== null}
        className="w-full rounded-2xl border border-red-300 bg-white px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loadingAction === "rejected" ? "Rejecting..." : "Reject"}
      </button>
    </div>
  );
}
