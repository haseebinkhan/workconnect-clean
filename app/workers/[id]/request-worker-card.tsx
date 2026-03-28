"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type RequestWorkerCardProps = {
  workerId: string;
  workerUserId: string;
  workerName: string;
  areaSlug: string;
  country?: string;
  region?: string;
  city?: string;
  postcode?: string;
  selectedMeetingAt?: string | null;
};

function toLocalDateTimeInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultFutureDateTime() {
  const now = new Date();
  now.setHours(now.getHours() + 2);
  now.setMinutes(0, 0, 0);
  return toLocalDateTimeInputValue(now);
}

function formatLocation({
  country,
  region,
  city,
  postcode,
}: {
  country?: string;
  region?: string;
  city?: string;
  postcode?: string;
}) {
  const parts = [city, region, country].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  if (postcode) return postcode;
  return "Location not specified";
}

export default function RequestWorkerCard({
  workerId,
  workerUserId,
  workerName,
  areaSlug,
  country,
  region,
  city,
  postcode,
  selectedMeetingAt,
}: RequestWorkerCardProps) {
  const supabase = createClient();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Work request");
  const [message, setMessage] = useState(
    `Hi ${workerName}, I found your profile on WorkConnect and would like to discuss some work.`
  );
  const [budgetAmount, setBudgetAmount] = useState("");
  const [meetingAt, setMeetingAt] = useState(
    selectedMeetingAt || defaultFutureDateTime()
  );
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (selectedMeetingAt) {
      setMeetingAt(selectedMeetingAt);
    }
  }, [selectedMeetingAt]);

  async function handleRequest() {
    try {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.href = "/auth/login";
        return;
      }

      if (!title.trim()) {
        setErrorMessage("Please enter a request title.");
        return;
      }

      if (!message.trim()) {
        setErrorMessage("Please enter a message.");
        return;
      }

      if (!meetingAt) {
        setErrorMessage("Please choose a meeting time before sending the request.");
        return;
      }

      if (budgetAmount.trim() && Number.isNaN(Number(budgetAmount))) {
        setErrorMessage("Budget must be a valid number.");
        return;
      }

      const response = await fetch("/api/bookings/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          workerUserId,
          workerProfileId: workerId,
          areaSlug,
          country: country || "United Kingdom",
          region: region || null,
          city: city || null,
          postcode: postcode || null,
          budgetAmount: budgetAmount.trim() ? Number(budgetAmount) : null,
          preferredMeetingAt: meetingAt,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.bookingId) {
          router.push("/messages/" + result.bookingId);
          return;
        }

        setErrorMessage(result.error || "Could not send request.");
        return;
      }

      setOpen(false);
      router.push("/messages/" + result.bookingId);
      router.refresh();
    } catch (error) {
      console.error("request worker error:", error);
      setErrorMessage("Could not send request.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) return;
    setOpen(false);
    setErrorMessage("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-6 w-full rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
      >
        Hire this worker
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Send request</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  Hire this worker
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {formatLocation({ country, region, city, postcode })}
                </p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Close
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {errorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Request title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
                  placeholder="What do you need help with?"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Message
                </label>
                <textarea
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
                  placeholder="Describe the work clearly"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Meeting time <span className="text-red-600">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={meetingAt}
                  onChange={(e) => setMeetingAt(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Pick the time to discuss the work before finalising.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Budget
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500"
                  placeholder="Optional"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  Request summary
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Worker: {workerName}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Location: {formatLocation({ country, region, city, postcode })}
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleRequest}
                  disabled={loading}
                  className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Sending..." : "Send request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}