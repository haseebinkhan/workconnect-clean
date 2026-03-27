"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type JobSearchItem = {
  id: string;
  title: string;
  description: string | null;
  city: string | null;
  area_slug: string | null;
  budget_min: number | null;
  budget_max: number | null;
  currency_code: string | null;
  created_at: string | null;
  category_name?: string | null;
  hirer_name?: string | null;
  location_type?: string | null;
  job_type?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatBudget(job: JobSearchItem) {
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

export default function JobsSearchClient({
  jobs,
}: {
  jobs: JobSearchItem[];
}) {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("");
  const [category, setCategory] = useState("");

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        jobs
          .map((job) => job.category_name)
          .filter((value): value is string => Boolean(value && value.trim()))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  const areas = useMemo(() => {
    return Array.from(
      new Set(
        jobs
          .map((job) => job.area_slug || job.city)
          .filter((value): value is string => Boolean(value && value.trim()))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesQuery =
        !q ||
        [
          job.title,
          job.description || "",
          job.city || "",
          job.area_slug || "",
          job.category_name || "",
          job.hirer_name || "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);

      const matchesArea =
        !area ||
        (job.area_slug || "").toLowerCase() === area.toLowerCase() ||
        (job.city || "").toLowerCase() === area.toLowerCase();

      const matchesCategory =
        !category ||
        (job.category_name || "").toLowerCase() === category.toLowerCase();

      return matchesQuery && matchesArea && matchesCategory;
    });
  }, [jobs, query, area, category]);

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Search jobs
            </label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Job title, city, area, category..."
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Area
            </label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            >
              <option value="">All areas</option>
              {areas.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            >
              <option value="">All categories</option>
              {categories.map((item) => (
                <option key={item} value={item.toLowerCase()}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 text-sm text-slate-500">
          {filteredJobs.length} job{filteredJobs.length === 1 ? "" : "s"} found
        </div>
      </div>

      {filteredJobs.length === 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">No jobs found</h2>
          <p className="mt-2 text-sm text-slate-600">
            Try changing your search, area, or category filters.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredJobs.map((job) => (
            <article
              key={job.id}
              className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-bold text-slate-900">
                      {job.title}
                    </h2>

                    {job.category_name ? (
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                        {job.category_name}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
                    <span>{job.city || job.area_slug || "Location not specified"}</span>
                    <span>{formatBudget(job)}</span>
                    {job.created_at ? <span>Posted {formatDate(job.created_at)}</span> : null}
                  </div>

                  {job.description ? (
                    <p className="mt-4 line-clamp-3 text-sm leading-7 text-slate-600">
                      {job.description}
                    </p>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">
                      No description provided.
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="inline-flex rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    View job
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}