"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ReportActions({
  reportId,
  currentStatus,
}: {
  reportId: string;
  currentStatus: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const updateStatus = async (status: "reviewing" | "resolved" | "dismissed") => {
    setLoading(true);

    const { error } = await supabase
      .from("reports")
      .update({ status })
      .eq("id", reportId);

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.refresh();
  };

  if (currentStatus === "resolved" || currentStatus === "dismissed") {
    return (
      <div className="text-sm font-medium text-slate-500">
        Report already {currentStatus}.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {currentStatus !== "reviewing" && (
        <button
          onClick={() => updateStatus("reviewing")}
          disabled={loading}
          className="rounded-2xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
        >
          {loading ? "Updating..." : "Mark reviewing"}
        </button>
      )}

      <button
        onClick={() => updateStatus("resolved")}
        disabled={loading}
        className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {loading ? "Updating..." : "Resolve"}
      </button>

      <button
        onClick={() => updateStatus("dismissed")}
        disabled={loading}
        className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
      >
        {loading ? "Updating..." : "Dismiss"}
      </button>
    </div>
  );
}
