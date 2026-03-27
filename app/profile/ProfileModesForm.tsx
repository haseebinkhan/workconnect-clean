"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ProfileModesForm({
  workerEnabled,
  hirerEnabled,
}: {
  workerEnabled: boolean;
  hirerEnabled: boolean;
}) {
  const router = useRouter();

  const [nextWorkerEnabled, setNextWorkerEnabled] = useState(workerEnabled);
  const [nextHirerEnabled, setNextHirerEnabled] = useState(hirerEnabled);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSave() {
    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const res = await fetch("/api/profile/update-modes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workerEnabled: nextWorkerEnabled,
          hirerEnabled: nextHirerEnabled,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Could not update account modes.");
      }

      setSuccessMessage("Account modes updated successfully.");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not update account modes."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">Account modes</h2>
      <p className="mt-2 text-sm leading-7 text-slate-600">
        Use one account for worker tasks, hirer tasks, or both. You can change these modes at any time.
      </p>

      {errorMessage ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        <label className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Enable Worker mode</p>
            <p className="mt-1 text-sm text-slate-600">
              Apply for jobs, receive requests, and work with hirers.
            </p>
          </div>

          <input
            type="checkbox"
            checked={nextWorkerEnabled}
            onChange={(e) => setNextWorkerEnabled(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-slate-300"
          />
        </label>

        <label className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Enable Hirer mode</p>
            <p className="mt-1 text-sm text-slate-600">
              Browse workers, post jobs, and manage requests/applications.
            </p>
          </div>

          <input
            type="checkbox"
            checked={nextHirerEnabled}
            onChange={(e) => setNextHirerEnabled(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-slate-300"
          />
        </label>
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save modes"}
        </button>
      </div>
    </div>
  );
}
