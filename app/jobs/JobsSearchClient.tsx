"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  getCities,
  getPostcodePrefixes,
  getRegions,
} from "@/lib/uk-locations";
import type { JobSearchItem } from "./page";

function formatDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function compactText(value?: string | null, max = 180) {
  const text = (value || "").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

function formatBudget(job: JobSearchItem) {
  if (job.budgetMin != null || job.budgetMax != null) {
    return `${job.currencyCode || "GBP"} ${job.budgetMin ?? 0} - ${
      job.budgetMax ?? 0
    }`;
  }
  return "Not specified";
}

function formatLocation(job: JobSearchItem) {
  const parts = [job.city, job.region, job.country].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  if (job.postcodePrefix) return job.postcodePrefix;
  if (job.areaSlug) return job.areaSlug;
  return "Location not specified";
}

export default function JobsSearchClient({
  jobs,
  defaultRegion = "",
}: {
  jobs: JobSearchItem[];
  defaultRegion?: string;
}) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState(defaultRegion || "");
  const [city, setCity] = useState("all");
  const [postcodePrefix, setPostcodePrefix] = useState("all");

  const regions = useMemo(() => getRegions(), []);
  const cityOptions = useMemo(() => (region ? getCities(region) : []), [region]);
  const postcodePrefixOptions = useMemo(() => {
    if (!region || city === "all") return [];
    return getPostcodePrefixes(region, city);
  }, [region, city]);

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();

    return jobs.filter((job) => {
      const haystack = [
        job.title,
        job.description || "",
        job.country || "",
        job.region || "",
        job.city || "",
        job.postcodePrefix || "",
        job.postcodeFull || "",
        job.areaSlug || "",
        job.locationType || "",
      ]
        .join(" ")
        .toLowerCase();

      const queryMatch = q ? haystack.includes(q) : true;

      const regionMatch = !region
        ? true
        : (job.region || "").trim().toLowerCase() === region.trim().toLowerCase();

      const cityMatch =
        city === "all"
          ? true
          : (job.city || "").trim().toLowerCase() === city.trim().toLowerCase();

      const postcodePrefixMatch =
        postcodePrefix === "all"
          ? true
          : (job.postcodePrefix || "").trim().toLowerCase() ===
            postcodePrefix.trim().toLowerCase();

      return queryMatch && regionMatch && cityMatch && postcodePrefixMatch;
    });
  }, [jobs, query, region, city, postcodePrefix]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Jobs</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                Find local jobs
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Browse jobs across the United Kingdom by region, city, postcode
                prefix, and keywords.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">
                {filteredJobs.length}
              </span>{" "}
              job{filteredJobs.length === 1 ? "" : "s"} found
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Search
              </label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Job title, description, city, postcode..."
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Nation / region
              </label>
              <select
                value={region}
                onChange={(e) => {
                  const nextRegion = e.target.value;
                  setRegion(nextRegion);
                  setCity("all");
                  setPostcodePrefix("all");
                }}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500"
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
              <label className="mb-2 block text-sm font-medium text-slate-700">
                City / main area
              </label>
              <select
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setPostcodePrefix("all");
                }}
                disabled={!region}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500 disabled:bg-slate-100"
              >
                <option value="all">
                  {region ? "All cities / areas" : "Select region first"}
                </option>
                {cityOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Postcode prefix
              </label>
              <select
                value={postcodePrefix}
                onChange={(e) => setPostcodePrefix(e.target.value)}
                disabled={!region || city === "all"}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500 disabled:bg-slate-100"
              >
                <option value="all">
                  {city !== "all" ? "All prefixes" : "Select city first"}
                </option>
                {postcodePrefixOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredJobs.length > 0 ? (
            filteredJobs.map((job) => (
              <article
                key={job.id}
                className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {job.title}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Posted {formatDateTime(job.createdAt)}
                    </p>
                  </div>

                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {job.status}
                  </span>
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
                      Postcode
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {job.postcodePrefix || job.postcodeFull || "Not specified"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Budget
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatBudget(job)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Type
                    </p>
                    <p className="mt-1 text-sm font-semibold capitalize text-slate-900">
                      {job.locationType || "Not specified"}
                    </p>
                  </div>
                </div>

                <p className="mt-5 line-clamp-4 text-sm leading-7 text-slate-600">
                  {compactText(job.description, 220) || "No description provided."}
                </p>

                <div className="mt-6 flex gap-3">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="flex-1 rounded-2xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    View job
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <div className="md:col-span-2 xl:col-span-3">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
                <h3 className="text-2xl font-bold text-slate-900">
                  No jobs found
                </h3>
                <p className="mt-3 text-slate-600">
                  Try changing region, city, postcode prefix, or search terms.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}