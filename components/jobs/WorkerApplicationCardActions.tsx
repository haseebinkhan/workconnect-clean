"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type WorkerApplicationCardActionsProps = {
  applicationId: string;
  currentStatus: string;
  bookingId?: string | null;
};

type UpdateResponse = {
  error?: string;
  success?: boolean;
  bookingId?: string | null;
  nextPath?: string | null;
  message?: string;
};

export default function WorkerApplicationCardActions({
  applicationId,
  currentStatus,
  bookingId,
}: WorkerApplicationCardActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canWithdraw = currentStatus === "pending";
  const canOpenChat = currentStatus === "accepted" && !!bookingId;

  const handleWithdraw = async () => {
    const confirmed = window.confirm(
      "Withdraw this application? This will keep your current flow unchanged, but mark this application as withdrawn."
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setErrorMessage(null);

      const response = await fetch("/api/jobs/applications/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicationId,
          action: "withdrawn",
        }),
      });

      const data = (await response.json()) as UpdateResponse;

      if (!response.ok) {
        throw new Error(data.error || "Could not withdraw application.");
      }

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not withdraw application."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-3">
        {canOpenChat ? (
          <Link
            href={`/messages/${bookingId}`}
            className="inline-flex rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Open chat
          </Link>
        ) : null}

        {canWithdraw ? (
          <button
            type="button"
            onClick={handleWithdraw}
            disabled={loading}
            className="inline-flex rounded-2xl border border-red-300 bg-white px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Withdrawing..." : "Withdraw application"}
          </button>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="mt-3 text-sm text-red-600">{errorMessage}</p>
      ) : null}
    </div>
  );
}

