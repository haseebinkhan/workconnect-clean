"use client";

import { useState } from "react";

type ProcessResult = {
  success?: boolean;
  processed?: number;
  sent?: number;
  failed?: number;
  message?: string;
};

export default function ProcessEmailQueueButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [error, setError] = useState("");

  async function handleProcessQueue() {
    try {
      setLoading(true);
      setError("");
      setResult(null);

      const res = await fetch("/api/cron/process-emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = (await res.json()) as ProcessResult & { error?: string };

      if (!res.ok) {
        throw new Error(data.error || data.message || "Could not process emails.");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Process email queue
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Manually send pending queued emails.
          </p>
        </div>

        <button
          type="button"
          onClick={handleProcessQueue}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Processing..." : "Process emails"}
        </button>
      </div>

      {result && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-medium">
            {result.message || "Email queue processed successfully."}
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div>Processed: {result.processed ?? 0}</div>
            <div>Sent: {result.sent ?? 0}</div>
            <div>Failed: {result.failed ?? 0}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}
    </div>
  );
}