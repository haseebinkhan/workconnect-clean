"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WorkerVisibilityToggle({
  isPublic,
}: {
  isPublic: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleToggle() {
    try {
      setLoading(true);
      setMessage("");

      const res = await fetch("/api/worker/visibility", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isPublic: !isPublic,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data?.message || "Could not update visibility.");
        return;
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage("Could not update visibility.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className={`rounded-2xl px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
          isPublic
            ? "bg-amber-500 hover:bg-amber-600"
            : "bg-emerald-600 hover:bg-emerald-700"
        }`}
      >
        {loading
          ? "Updating..."
          : isPublic
          ? "Hide from public"
          : "Make public"}
      </button>

      <p className="text-sm text-slate-600">
        {isPublic
          ? "Your worker profile is visible publicly."
          : "Your worker profile is hidden from public view."}
      </p>

      {message ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      ) : null}
    </div>
  );
}
