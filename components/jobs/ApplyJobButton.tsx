"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type ApplyJobButtonProps = {
  jobId: string;
  jobTitle?: string;
  canApply?: boolean;
  alreadyApplied?: boolean;
};

type ApplyResponse = {
  error?: string;
  success?: boolean;
  message?: string;
};

const availabilityOptions = [
  { value: "flexible", label: "Flexible" },
  { value: "asap", label: "As soon as possible" },
  { value: "full_time", label: "Full time" },
  { value: "part_time", label: "Part time" },
  { value: "weekends", label: "Weekends" },
  { value: "evenings", label: "Evenings" },
];

export default function ApplyJobButton({
  jobId,
  jobTitle,
  canApply = true,
  alreadyApplied = false,
}: ApplyJobButtonProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [coverMessage, setCoverMessage] = useState("");
  const [proposedRate, setProposedRate] = useState("");
  const [phone, setPhone] = useState("");
  const [availabilityType, setAvailabilityType] = useState("flexible");
  const [startDate, setStartDate] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = () => {
    setCoverMessage("");
    setProposedRate("");
    setPhone("");
    setAvailabilityType("flexible");
    setStartDate("");
    setPortfolioUrl("");
    setLinkedinUrl("");
    setCvFile(null);
    setErrorMessage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateForm = (): string | null => {
    if (linkedinUrl.trim()) {
      try {
        new URL(linkedinUrl.trim());
      } catch {
        return "Please enter a valid LinkedIn URL.";
      }
    }

    if (portfolioUrl.trim()) {
      try {
        new URL(portfolioUrl.trim());
      } catch {
        return "Please enter a valid portfolio URL.";
      }
    }

    if (proposedRate.trim()) {
      const numericRate = Number(proposedRate);
      if (Number.isNaN(numericRate) || numericRate < 0) {
        return "Please enter a valid proposed rate.";
      }
    }

    if (cvFile) {
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (!allowedTypes.includes(cvFile.type)) {
        return "CV must be a PDF or Word document.";
      }

      const maxBytes = 5 * 1024 * 1024;
      if (cvFile.size > maxBytes) {
        return "CV file must be smaller than 5MB.";
      }
    }

    return null;
  };

  const handleApply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setLoading(true);

    try {
      const payload = new FormData();
      payload.append("jobId", jobId);
      payload.append("coverMessage", coverMessage.trim());
      payload.append("proposedRate", proposedRate.trim());
      payload.append("phone", phone.trim());
      payload.append("availabilityType", availabilityType);
      payload.append("startDate", startDate.trim());
      payload.append("portfolioUrl", portfolioUrl.trim());
      payload.append("linkedinUrl", linkedinUrl.trim());

      if (cvFile) {
        payload.append("cvFile", cvFile);
      }

      const response = await fetch("/api/jobs/apply", {
        method: "POST",
        body: payload,
      });

      const raw = await response.text();
      let data: ApplyResponse = {};

      try {
        data = raw ? (JSON.parse(raw) as ApplyResponse) : {};
      } catch {
        data = { error: raw || "Unknown server response" };
      }

      if (!response.ok) {
        setErrorMessage(data.error || "Could not submit application.");
        return;
      }

      setShowModal(false);
      resetForm();
      setSuccessMessage(
        data.message || `Your application for "${jobTitle || "this job"}" has been submitted.`
      );
    } catch (error) {
      console.error("Apply job failed:", error);
      setErrorMessage("Could not submit application.");
    } finally {
      setLoading(false);
    }
  };

  if (alreadyApplied) {
    return (
      <Link
        href="/my-applications"
        className="inline-flex w-full items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
      >
        Already applied
      </Link>
    );
  }

  if (!canApply) {
    return (
      <Link
        href="/profile"
        className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        Enable worker mode to apply
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErrorMessage(null);
          setSuccessMessage(null);
          setShowModal(true);
        }}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
      >
        Apply now
      </button>

      {successMessage ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {showModal ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Apply for job</p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900">
                  {jobTitle || "this job"}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  All fields are optional. The hirer will also see your worker profile details.
                </p>
              </div>

              <button
                type="button"
                onClick={() => !loading && setShowModal(false)}
                className="rounded-full border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleApply} className="mt-6 space-y-5">
              {errorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Cover message
                </label>
                <textarea
                  value={coverMessage}
                  onChange={(e) => setCoverMessage(e.target.value)}
                  rows={5}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Optional message to the hirer"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    LinkedIn URL
                  </label>
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Portfolio URL
                  </label>
                  <input
                    type="url"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Proposed rate
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={proposedRate}
                    onChange={(e) => setProposedRate(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Availability
                  </label>
                  <select
                    value={availabilityType}
                    onChange={(e) => setAvailabilityType(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {availabilityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Start date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Upload CV
                </label>
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-700"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Optional. Accepted: PDF, DOC, DOCX. Max size: 5MB.
                  </p>

                  {cvFile ? (
                    <div className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
                      Selected: <span className="font-medium">{cvFile.name}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => !loading && setShowModal(false)}
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Submitting..." : "Submit application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}