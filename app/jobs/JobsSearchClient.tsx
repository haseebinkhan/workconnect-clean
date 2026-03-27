"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { JobSearchItem } from "./page";

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function JobsSearchClient({
  jobs,
}: {
  jobs: JobSearchItem[];
}) {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const areas = useMemo(() => {
    return [...new Set(jobs.map((j) => j.areaSlug).filter(Boolean))].sort();
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();

    const next = jobs.filter((job) => {
      const matchesQuery =
        q === "" ||
        job.title.toLowerCase().includes(q) ||
        job.description.toLowerCase().includes(q) ||
        (job.city || "").toLowerCase().includes(q) ||
        (job.areaSlug || "").toLowerCase().includes(q) ||
        job.hirerName.toLowerCase().includes(q);

      const matchesArea =
        area === "all" || (job.areaSlug || "").toLowerCase() === area;

      return matchesQuery && matchesArea;
    });

    next.sort((a, b) => {
      if (sortBy === "budget-high") {
        return (b.budgetMax ?? b.budgetMin ?? 0) - (a.budgetMax ?? a.budgetMin ?? 0);
      }

      if (sortBy === "budget-low") {
        return (a.budgetMin ?? a.budgetMax ?? 0) - (b.budgetMin ?? b.budgetMax ?? 0);
      }

      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    return next;
  }, [jobs, query, area, sortBy]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">Worker area</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Browse jobs
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Search relevant jobs by keyword and area, then sort by date or budget.
          </p>
        </div>

        <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="xl:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Search jobs
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, description, hirer, city, or area"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Area
              </label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All areas</option>
                {areas.map((item) => (
                  <option key={item} value={String(item).toLowerCase()}>
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
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="newest">Newest first</option>
                <option value="budget-high">Highest budget</option>
                <option value="budget-low">Lowest budget</option>
              </select>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {filteredJobs.length} job{filteredJobs.length === 1 ? "" : "s"} found
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">No jobs match your search</h2>
            <p className="mt-2 text-sm text-slate-600">
              Try a different keyword or area.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredJobs.map((job) => (
              <article
                key={job.id}
                className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">{job.title}</h2>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                    Open
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-600">{job.hirerName}</p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Budget
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {job.currencyCode || "GBP"} {job.budgetMin ?? 0}
                      {job.budgetMax != null ? ` - ${job.budgetMax}` : ""}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Area
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {job.areaSlug || job.city || "Not specified"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Posted
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatDate(job.createdAt)}
                    </p>
                  </div>
                </div>

                <p className="mt-5 line-clamp-4 text-sm leading-7 text-slate-700">
                  {job.description}
                </p>

                <div className="mt-6">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    View details
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
