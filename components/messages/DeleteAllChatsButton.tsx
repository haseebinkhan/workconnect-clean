"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteAllChatsButton({
  onDeletedAll,
}: {
  onDeletedAll?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDeleteAll = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/messages/delete-all-chats", {
        method: "POST",
      });

      const raw = await response.text();
      let data: { error?: string; success?: boolean } = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { error: raw || "Unknown server response" };
      }

      if (!response.ok) {
        setErrorMessage(data.error || "Could not delete all chats");
        return;
      }

      onDeletedAll?.();
      router.refresh();
    } catch (error) {
      console.error("Delete all chats failed:", error);
      setErrorMessage("Could not delete all chats");
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
      >
        {loading ? "Deleting all..." : "Delete all chats"}
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Delete all chats</h2>
            <p className="mt-3 text-sm text-slate-600">
              Delete all chats for you? This will hide all chats from your list.
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteAll}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-red-600">Action failed</h2>
            <p className="mt-3 text-sm text-slate-600">{errorMessage}</p>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setErrorMessage(null)}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
