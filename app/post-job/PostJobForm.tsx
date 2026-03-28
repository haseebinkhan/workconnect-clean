"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type AreaItem = {
  id: string;
  name: string;
  slug: string;
  region?: string | null;
};

const UK_COUNTRIES = [
  { value: "United Kingdom", label: "United Kingdom" },
];

const UK_REGIONS = [
  "England",
  "Northern Ireland",
  "Scotland",
  "Wales",
];

function slugifyArea(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

export default function PostJobForm({
  areas,
  regions,
  defaultCountry,
  defaultRegion,
  defaultCity,
}: {
  areas: AreaItem[];
  regions?: string[];
  defaultCountry?: string;
  defaultRegion?: string;
  defaultCity?: string;
}) {
  const router = useRouter();

  const regionOptions = regions && regions.length > 0 ? regions : UK_REGIONS;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState(defaultCountry || "United Kingdom");
  const [region, setRegion] = useState(defaultRegion || "Northern Ireland");
  const [city, setCity] = useState(defaultCity || "");
  const [postcode, setPostcode] = useState("");
  const [areaSlug, setAreaSlug] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const canSubmit = useMemo(() => {
    return (
      title.trim().length > 0 &&
      description.trim().length > 0 &&
      country.trim().length > 0 &&
      region.trim().length > 0 &&
      city.trim().length > 0 &&
      postcode.trim().length > 0 &&
      !submitting
    );
  }, [title, description, country, region, city, postcode, submitting]);

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

    if (!country.trim()) {
      setErrorMessage("Please select a country.");
      return;
    }

    if (!region.trim()) {
      setErrorMessage("Please select a nation or region.");
      return;
    }

    if (!city.trim()) {
      setErrorMessage("Please enter a city or town.");
      return;
    }

    if (!postcode.trim()) {
      setErrorMessage("Please enter a postcode.");
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

      const computedAreaSlug =
        areaSlug.trim() || slugifyArea(city.trim() || region.trim());

      const res = await fetch("/api/jobs/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          areaSlug: computedAreaSlug,
          country: country.trim(),
          region: region.trim(),
          city: city.trim(),
          postcode: postcode.trim().toUpperCase(),
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
      setCountry(defaultCountry || "United Kingdom");
      setRegion(defaultRegion || "Northern Ireland");
      setCity(defaultCity || "");
      setPostcode("");
      setAreaSlug("");
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
            Country
          </label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {UK_COUNTRIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Nation / region
          </label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select region</option>
            {regionOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            City / town
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Belfast"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Postcode
          </label>
          <input
            type="text"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value.toUpperCase())}
            placeholder="e.g. BT7 1NN"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 uppercase text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Internal area slug
        </label>
        <input
          type="text"
          value={areaSlug}
          onChange={(e) => setAreaSlug(e.target.value)}
          placeholder="Optional. Auto-generated if left blank."
          className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="mt-2 text-xs text-slate-500">
          This is kept for compatibility with the current project. City and region
          are now the main location fields.
        </p>
      </div>

      {areas.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">
            Existing area records detected
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Your project still supports legacy area data in the background. New
            UK-ready job posts will primarily use country, region, city, and postcode.
          </p>
        </div>
      ) : null}

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
