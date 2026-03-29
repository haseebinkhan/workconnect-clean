"use client";

import { useState } from "react";

type SaveWorkerButtonProps = {
  workerUserId: string;
  initiallySaved?: boolean;
  fullWidth?: boolean;
};

export default function SaveWorkerButton({
  workerUserId,
  initiallySaved = false,
  fullWidth = false,
}: SaveWorkerButtonProps) {
  const [saved, setSaved] = useState(initiallySaved);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    try {
      setLoading(true);

      const response = await fetch("/api/favorites/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workerUserId,
        }),
      });

      const raw = await response.text();
      const data = raw ? JSON.parse(raw) : {};

      if (!response.ok) {
        alert(data?.error || "Could not update saved workers.");
        return;
      }

      setSaved(Boolean(data.saved));
    } catch (error) {
      console.error("save worker error:", error);
      alert("Could not update saved workers.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
        saved
          ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
      } ${fullWidth ? "w-full" : ""}`}
    >
      {loading ? "Updating..." : saved ? "Saved" : "Save worker"}
    </button>
  );
}

