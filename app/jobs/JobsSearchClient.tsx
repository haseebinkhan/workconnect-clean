"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  getCities,
  getPostcodePrefixes,
  getRegions,
} from "@/lib/uk-locations";

type JobItem = {
  id: string;
  hirer_id?: string | null;
  category?: string | null;
  title: string | null;
  title_slug?: string | null;
  description: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  postcode?: string | null;
  postcode_prefix?: string | null;
  postcode_full?: string | null;
  area_slug?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  currency_code?: string | null;
  location_type?: string | null;
  status?: string | null;
  visibility?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  hirer_company_name?: string | null;
  hirer_contact_name?: string | null;
  hirer_industry?: string | null;
};

type WorkerDefaults = {
  category?: string;
  region?: string;
  city?: string;
  postcodePrefix?: string;
};

type JobsSearchClientProps = {
  initialJobs: JobItem[];
  workerDefaults?: WorkerDefaults | null;
};

const CATEGORY_OPTIONS = [
  "Cleaning",
  "Electrical",
  "Plumbing",
  "Painting",
  "Gardening",
  "Handyman",
  "Moving",
  "Delivery",
  "Warehouse",
  "Hospitality",
  "Care",
  "Childcare",
  "Pet Care",
  "Tutoring",
  "Admin",
  "IT",
  "General",
];

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function compactText(value?: string | null, max = 140) {
  const text = (value || "").trim();
  if (!text) return "No description provided yet.";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

function formatBudget(job: JobItem) {
  const currency = job.currency_code || "GBP";

  if (job.budget_min != null && job.budget_max != null) {
    return `${currency} ${job.budget_min} - ${job.budget_max}`;
  }

  if (job.budget_min != null) {
    return `${currency} ${job.budget_min}+`;
  }

  if (job.budget_max != null) {
    return `Up to ${currency} ${job.budget_max}`;
  }

  return "Budget not specified";
}

function formatLocation(job: JobItem) {
  const parts = [job.city, job.region, job.country].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  if (job.postcode_full) return job.postcode_full;
  if (job.postcode_prefix) return job.postcode_prefix;
  if (job.postcode) return job.postcode;
  if (job.area_slug) return job.area_slug;
  return "Location not specified";
}

function getEffectivePostcodePrefix(job: JobItem) {
  return (
    job.postcode_prefix ||
    job.postcode ||
    (job.postcode_full ? job.postcode_full.split(" ")[0] : "") ||
    ""
  );
}

function getRecommendationScore(
  job: JobItem,
  workerDefaults?: WorkerDefaults | null
) {
  if (!workerDefaults) return 0;

  let score = 0;

  const workerCategory = (workerDefaults.category || "").trim().toLowerCase();
  const jobCategory = (job.category || "").trim().toLowerCase();

  const workerRegion = (workerDefaults.region || "").trim().toLowerCase();
  const jobRegion = (job.region || "").trim().toLowerCase();

  const workerCity = (workerDefaults.city || "").trim().toLowerCase();
  const jobCity = (job.city || "").trim().toLowerCase();

  const workerPrefix = (workerDefaults.postcodePrefix || "").trim().toUpperCase();
  const jobPrefix = getEffectivePostcodePrefix(job).trim().toUpperCase();

  if (workerCategory && jobCategory && workerCategory === jobCategory) {
    score += 50;
  }

  if (workerRegion && jobRegion && workerRegion === jobRegion) {
    score += 25;
  }

  if (workerCity && jobCity && workerCity === jobCity) {
    score += 20;
  }

  if (workerPrefix && jobPrefix && workerPrefix === jobPrefix) {
    score += 15;
  }

  return score;
}

export default function JobsSearchClient({
  initialJobs,
  workerDefaults,
}: JobsSearchClientProps) {
  const regions = useMemo(() => getRegions(), []);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(workerDefaults?.category || "");
  const [region, setRegion] = useState(workerDefaults?.region || "");
  const [city, setCity] = useState(workerDefaults?.city || "");
  const [postcodePrefix, setPostcodePrefix] = useState(
    workerDefaults?.postcodePrefix || ""
  );
  const [locationType, setLocationType] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [sortBy, setSortBy] = useState(
    workerDefaults ? "recommended" : "newest"
  );

  const cityOptions = useMemo(() => getCities(region), [region]);
  const postcodePrefixOptions = useMemo(
    () => getPostcodePrefixes(region, city),
    [region, city]
  );

  const filteredJobs = useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    const minBudgetValue = budgetMin.trim() ? Number(budgetMin) : null;
    const maxBudgetValue = budgetMax.trim() ? Number(budgetMax) : null;

    const filtered = (initialJobs || []).filter((job) => {
      const matchesSearch =
        !searchLower ||
        (job.title || "").toLowerCase().includes(searchLower) ||
        (job.description || "").toLowerCase().includes(searchLower) ||
        (job.category || "").toLowerCase().includes(searchLower) ||
        (job.city || "").toLowerCase().includes(searchLower) ||
        (job.region || "").toLowerCase().includes(searchLower) ||
        (job.hirer_company_name || "").toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      if (category && (job.category || "") !== category) return false;
      if (region && (job.region || "") !== region) return false;
      if (city && (job.city || "") !== city) return false;

      const jobPrefix = getEffectivePostcodePrefix(job);
      if (
        postcodePrefix &&
        jobPrefix.toUpperCase() !== postcodePrefix.toUpperCase()
      ) {
        return false;
      }

      if (locationType && (job.location_type || "") !== locationType) {
        return false;
      }

      if (minBudgetValue != null && !Number.isNaN(minBudgetValue)) {
        const jobMax = job.budget_max ?? job.budget_min ?? null;
        if (jobMax != null && jobMax < minBudgetValue) return false;
      }

      if (maxBudgetValue != null && !Number.isNaN(maxBudgetValue)) {
        const jobMin = job.budget_min ?? job.budget_max ?? null;
        if (jobMin != null && jobMin > maxBudgetValue) return false;
      }

      return true;
    });

    const sorted = [...filtered];

    sorted.sort((a, b) => {
      if (sortBy === "recommended") {
        const scoreA = getRecommendationScore(a, workerDefaults);
        const scoreB = getRecommendationScore(b, workerDefaults);

        if (scoreB !== scoreA) return scoreB - scoreA;

        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      }

      if (sortBy === "budget_high") {
        const aValue = a.budget_max ?? a.budget_min ?? 0;
        const bValue = b.budget_max ?? b.budget_min ?? 0;
        return bValue - aValue;
      }

      if (sortBy === "budget_low") {
        const aValue = a.budget_min ?? a.budget_max ?? 0;
        const bValue = b.budget_min ?? b.budget_max ?? 0;
        return aValue - bValue;
      }

      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

    return sorted;
  }, [
    initialJobs,
    search,
    category,
    region,
    city,
    postcodePrefix,
    locationType,
    budgetMin,
    budgetMax,
    sortBy,
    workerDefaults,
  ]);

  function resetFilters() {
    setSearch("");
    setCategory(workerDefaults?.category || "");
    setRegion(workerDefaults?.region || "");
    setCity(workerDefaults?.city || "");
    setPostcodePrefix(workerDefaults?.postcodePrefix || "");
    setLocationType("");
    setBudgetMin("");
    setBudgetMax("");
    setSortBy(workerDefaults ? "recommended" : "newest");
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Job search</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Find local jobs faster
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Filter jobs by category, area, postcode prefix, work type, and budget.
            </p>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
          >
            Reset filters
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, category, city, or keyword"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All categories</option>
              {CATEGORY_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Sort by
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500"
            >
              {workerDefaults ? (
                <option value="recommended">Recommended</option>
              ) : null}
              <option value="newest">Newest</option>
              <option value="budget_high">Highest budget</option>
              <option value="budget_low">Lowest budget</option>
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Nation / region
            </label>
            <select
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                setCity("");
                setPostcodePrefix("");
              }}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All regions</option>
              {regions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              City / town
            </label>
            <select
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setPostcodePrefix("");
              }}
              disabled={!region}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
            >
              <option value="">
                {region ? "All cities" : "Select region first"}
              </option>
              {cityOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Postcode prefix
            </label>
            <select
              value={postcodePrefix}
              onChange={(e) => setPostcodePrefix(e.target.value)}
              disabled={!region || !city}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
            >
              <option value="">
                {city ? "All prefixes" : "Select city first"}
              </option>
              {postcodePrefixOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Work type
            </label>
            <select
              value={locationType}
              onChange={(e) => setLocationType(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All work types</option>
              <option value="local">Local / on-site</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:max-w-xl">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Minimum budget
            </label>
            <input
              type="number"
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
              placeholder="e.g. 50"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500"
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
              placeholder="e.g. 200"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {workerDefaults ? (
          <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
            Jobs are being ranked to favour matches closer to your category and area.
          </div>
        ) : null}
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">
              Available jobs
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {filteredJobs.length} {filteredJobs.length === 1 ? "job" : "jobs"} found
            </p>
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h4 className="text-xl font-semibold text-slate-900">
              No matching jobs found
            </h4>
            <p className="mt-2 text-sm text-slate-600">
              Try changing your filters to see more results.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredJobs.map((job) => {
              const recommendationScore = getRecommendationScore(
                job,
                workerDefaults
              );

              return (
                <article
                  key={job.id}
                  className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xl font-bold text-slate-900">
                        {job.title || "Untitled job"}
                      </h4>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {job.category ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {job.category}
                          </span>
                        ) : null}

                        {job.location_type ? (
                          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                            {job.location_type === "local"
                              ? "Local / on-site"
                              : job.location_type === "remote"
                              ? "Remote"
                              : "Hybrid"}
                          </span>
                        ) : null}

                        {workerDefaults && recommendationScore > 0 ? (
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Good match
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Budget
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {formatBudget(job)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Location
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatLocation(job)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Posted
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatDate(job.created_at) || "Recently"}
                      </p>
                    </div>
                  </div>

                  <p className="mt-5 text-sm leading-7 text-slate-600">
                    {compactText(job.description)}
                  </p>

                  <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Posted by
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {job.hirer_company_name || job.hirer_contact_name || "Hirer"}
                    </p>
                    {job.hirer_industry ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {job.hirer_industry}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-6 flex gap-3">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="flex-1 rounded-2xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                      View job
                    </Link>

                    <Link
                      href={`/jobs/${job.id}`}
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                    >
                      Apply
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}