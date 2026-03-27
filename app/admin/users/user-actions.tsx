"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function UserActions({
  userId,
  isActive,
}: {
  userId: string;
  isActive: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const setActive = async (nextValue: boolean) => {
    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({ is_active: nextValue })
      .eq("id", userId);

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.refresh();
  };

  return isActive ? (
    <button
      onClick={() => setActive(false)}
      disabled={loading}
      className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
    >
      {loading ? "Updating..." : "Deactivate"}
    </button>
  ) : (
    <button
      onClick={() => setActive(true)}
      disabled={loading}
      className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
    >
      {loading ? "Updating..." : "Reactivate"}
    </button>
  );
}