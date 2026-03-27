"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type AreaItem = {
  id: string;
  name: string;
  slug: string;
  region?: string | null;
};

const BT_POSTCODES = Array.from({ length: 94 }, (_, i) => `BT${i + 1}`);

export default function PostJobForm({
  areas,
}: {
  areas: AreaItem[];
}) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [areaSlug, setAreaSlug] = useState("");
  const [postcode, setPostcode] = useState("");
  const [city, setCity] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const canSubmit = useMemo(() => {
    return (
      title.trim().length > 0 &&
      description.trim().length > 0 &&
      areaSlug.trim().length > 0 &&
      postcode.trim().length > 0 &&
      !submitting
    );
  }, [title, description, areaSlug, postcode, submitting]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!title.trim()) {
      setErrorMessage("Please enter a job title.");
      return;
    }

    if (!description.trim()) {
      setErrorMessage("Please enter a job description.");
      return;
    }

    if (!areaSlug.trim()) {
      setErrorMessage("Please select an area.");
      return;
    }

    if (!postcode.trim()) {
      setErrorMessage("Please select a BT postcode.");
      return;
    }

    if (budgetMin && Number.isNaN(Number(budgetMin))) {
      setErrorMessage("Minimum budget must be a valid number.");
      return;
    }

    if (budgetMax && Number.isNaN(Number(budgetMax))) {
      setErrorMessage("Maximum budget must be a valid number.");
      return;
    }

    if (budgetMin && budgetMax && Number(budgetMin) > Number(budgetMax)) {
      setErrorMessage("Minimum budget cannot be greater than maximum budget.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const locationValue = city.trim()
        ? `${city.trim()} - ${postcode}`
        : postcode;

      const res = await fetch("/api/jobs/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          areaSlug,
          city: locationValue,
          budgetMin: budgetMin === "" ? null : Number(budgetMin),
          budgetMax: budgetMax === "" ? null : Number(budgetMax),
          currencyCode: "GBP",
          locationType: "local",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Could not create job.");
      }

      setSuccessMessage(
        data?.message || "Job submitted for review successfully."
      );

      setTitle("");
      setDescription("");
      setAreaSlug("");
      setPostcode("");
      setCity("");
      setBudgetMin("");
      setBudgetMax("");

      setTimeout(() => {
        router.push("/my-job-posts");
        router.refresh();
      }, 1200);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not create job."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Job title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="e.g. Need a plumber for kitchen sink repair"
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={7}
          maxLength={5000}
          placeholder="Describe the work clearly, expected timing, materials, skills needed, and anything else useful."
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Area
          </label>
          <select
            value={areaSlug}
            onChange={(e) => setAreaSlug(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select an area</option>
            {areas.map((area) => (
              <option key={area.id} value={area.slug}>
                {area.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            BT postcode
          </label>
          <select
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select BT postcode</option>
            {BT_POSTCODES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          City / town
        </label>
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Optional, e.g. Belfast"
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="mt-2 text-xs text-slate-500">
          This is optional. The selected BT postcode will still be saved.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Minimum budget
          </label>
          <input
            type="number"
            value={budgetMin}
            onChange={(e) => setBudgetMin(e.target.value)}
            min="0"
            step="0.01"
            placeholder="e.g. 50"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Maximum budget
          </label>
          <input
            type="number"
            value={budgetMax}
            onChange={(e) => setBudgetMax(e.target.value)}
            min="0"
            step="0.01"
            placeholder="e.g. 150"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Submit job for review"}
        </button>
      </div>
    </form>
  );
}