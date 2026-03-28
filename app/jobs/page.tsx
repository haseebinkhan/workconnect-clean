import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function formatDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isExpired(expiresAt?: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

function formatLocation(job: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
  postcode?: string | null;
  area_slug?: string | null;
}) {
  const parts = [job.city, job.region, job.country].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  if (job.postcode) return job.postcode;
  if (job.area_slug) return job.area_slug;
  return "Local area";
}

function formatBudget(job: {
  budget_min?: number | null;
  budget_max?: number | null;
  currency_code?: string | null;
}) {
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

  return "Not specified";
}

export default async function JobsPage() {
  const supabase = await createClient();

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select(`
      id,
      title,
      description,
      country,
      region,
      city,
      postcode,
      area_slug,
      budget_min,
      budget_max,
      currency_code,
      location_type,
      status,
      visibility,
      created_at,
      expires_at,
      deleted_at
    `)
    .eq("status", "open")
    .eq("visibility", "public")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const visibleJobs = (jobs || []).filter((job) => !isExpired(job.expires_at));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">Find work</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Open jobs
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Browse currently active job opportunities across the United Kingdom.
          </p>
        </div>

        {error ? (
          <div className="rounded-[2rem] border border-red-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-red-600">
              {error.message || "Could not load jobs."}
            </p>
          </div>
        ) : visibleJobs.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              No active jobs right now
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Check again later for new listings.
            </p>
          </div>
        ) : (
          <div className="grid gap-5">
            {visibleJobs.map((job) => (
              <article
                key={job.id}
                className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-bold text-slate-900">
                        {job.title}
                      </h2>

                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        {job.status}
                      </span>

                      {job.location_type ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                          {job.location_type}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {job.description}
                    </p>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">Location</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {formatLocation(job)}
                        </p>
                        {job.postcode ? (
                          <p className="mt-1 text-xs text-slate-500">
                            {job.postcode}
                          </p>
                        ) : null}
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">Work type</p>
                        <p className="mt-1 text-sm font-semibold capitalize text-slate-900">
                          {job.location_type || "Not specified"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">Budget</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {formatBudget(job)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">Posted</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {formatDateTime(job.created_at)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">Expires</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {formatDateTime(job.expires_at)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full lg:w-auto">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="inline-flex w-full items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 lg:w-auto"
                    >
                      View job
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
