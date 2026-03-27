"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function UserActions({
  userId,
  userName,
  isActive,
}: {
  userId: string;
  userName: string;
  isActive: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [loadingToggle, setLoadingToggle] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [message, setMessage] = useState("");

  const setActive = async (nextValue: boolean) => {
    try {
      setLoadingToggle(true);
      setMessage("");

      const { error } = await supabase
        .from("profiles")
        .update({ is_active: nextValue })
        .eq("id", userId);

      if (error) {
        setMessage(error.message);
        return;
      }

      router.refresh();
    } catch (error) {
      console.error("toggle user status error:", error);
      setMessage("Could not update user status.");
    } finally {
      setLoadingToggle(false);
    }
  };

  const deleteUser = async () => {
    const ok = window.confirm(
      `Delete ${userName}? This will permanently remove the account and related data.`
    );

    if (!ok) return;

    try {
      setLoadingDelete(true);
      setMessage("");

      const res = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userIds: [userId],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data?.message || "Could not delete user.");
        return;
      }

      router.refresh();
    } catch (error) {
      console.error("delete user error:", error);
      setMessage("Could not delete user.");
    } finally {
      setLoadingDelete(false);
    }
  };

  return (
    <div className="space-y-3">
      {isActive ? (
        <button
          type="button"
          onClick={() => setActive(false)}
          disabled={loadingToggle || loadingDelete}
          className="w-full rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingToggle ? "Updating..." : "Deactivate"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setActive(true)}
          disabled={loadingToggle || loadingDelete}
          className="w-full rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingToggle ? "Updating..." : "Reactivate"}
        </button>
      )}

      <button
        type="button"
        onClick={deleteUser}
        disabled={loadingToggle || loadingDelete}
        className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loadingDelete ? "Deleting..." : "Delete user"}
      </button>

      {message ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      ) : null}
    </div>
  );
}