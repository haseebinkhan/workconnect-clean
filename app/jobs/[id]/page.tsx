import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ApplyJobButton from "@/components/jobs/ApplyJobButton";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isExpired(expiresAt?: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

function formatBudget(
  budgetMin?: number | null,
  budgetMax?: number | null,
  currencyCode?: string | null
) {
  const currency = currencyCode || "GBP";

  if (budgetMin != null && budgetMax != null) {
    return `${currency} ${budgetMin} - ${budgetMax}`;
  }

  if (budgetMin != null) {
    return `${currency} ${budgetMin}+`;
  }

  if (budgetMax != null) {
    return `Up to ${currency} ${budgetMax}`;
  }

  return "Not specified";
}

function formatLocation(job: {
  country?: string | null;
  region?: string | null;
  city?: string | null;
  postcode?: string | null;
  area_slug?: string | null;
}) {
  const parts = [job.city, job.region, job.country].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  if (job.postcode) return job.postcode;
  if (job.area_slug) return job.area_slug;
  return "Local area";
}

export default async function JobDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: job, error: jobError }, { data: currentProfile }] = await Promise.all([
    supabase
      .from("jobs")
      .select(`
        id,
        hirer_id,
        title,
        description,
        budget_min,
        budget_max,
        currency_code,
        location_type,
        country,
        region,
        city,
        postcode,
        area_slug,
        status,
        visibility,
        created_at,
        updated_at,
        expires_at,
        deleted_at
      `)
      .eq("id", id)
      .maybeSingle(),

    user
      ? supabase
          .from("profiles")
          .select("id, worker_enabled, hirer_enabled, is_active")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (jobError || !job || job.deleted_at) {
    notFound();
  }

  const expired = isExpired(job.expires_at);

  const { data: hirerProfile } = await supabase
    .from("hirer_profiles")
    .select("id, user_id, company_name, contact_name")
    .eq("id", job.hirer_id)
    .maybeSingle();

  const isOwnJob = !!user && hirerProfile?.user_id === user.id;

  let alreadyApplied = false;

  if (user && currentProfile?.worker_enabled) {
    const { data: workerProfile } = await supabase
      .from("worker_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (workerProfile?.id) {
      const { data: existingApplication } = await supabase
        .from("job_applications")
        .select("id")
        .eq("job_id", job.id)
        .eq("worker_id", workerProfile.id)
        .maybeSingle();

      alreadyApplied = !!existingApplication;
    }
  }

  const canApply =
    !!user &&
    !isOwnJob &&
    currentProfile?.is_active === true &&
    currentProfile?.worker_enabled === true &&
    job.status === "open" &&
    job.visibility === "public" &&
    !expired;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr),360px]">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Job details</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  {job.title}
                </h1>
              </div>

              <span
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide ${
                  expired
                    ? "bg-red-50 text-red-700"
                    : job.status === "open"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {expired ? "expired" : job.status}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Budget</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatBudget(job.budget_min, job.budget_max, job.currency_code)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Location</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatLocation(job)}
                </p>
                {job.postcode ? (
                  <p className="mt-1 text-xs text-slate-500">{job.postcode}</p>
                ) : null}
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Type</p>
                <p className="mt-1 text-sm font-semibold capitalize text-slate-900">
                  {job.location_type || "Not specified"}
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

            <div className="mt-8 rounded-[1.5rem] bg-slate-50 p-5 sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">Description</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {job.description || "No description provided."}
              </p>
            </div>

            <div className="mt-6">
              <Link
                href="/jobs"
                className="inline-flex rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Back to jobs
              </Link>
            </div>
          </article>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">About the hirer</h2>
              <p className="mt-3 text-sm text-slate-600">
                {hirerProfile?.company_name || hirerProfile?.contact_name || "Hirer"}
              </p>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Apply</h2>

              {expired ? (
                <p className="mt-3 text-sm leading-7 text-red-600">
                  This job has expired and is no longer accepting applications.
                </p>
              ) : !user ? (
                <>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Sign in to apply for this job.
                  </p>
                  <div className="mt-5">
                    <Link
                      href="/auth/login"
                      className="inline-flex w-full items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                      Log in
                    </Link>
                  </div>
                </>
              ) : isOwnJob ? (
                <>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    This is your own job post, so you cannot apply to it.
                  </p>
                  <div className="mt-5">
                    <Link
                      href="/my-job-posts"
                      className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                    >
                      Manage my job posts
                    </Link>
                  </div>
                </>
              ) : !currentProfile?.is_active ? (
                <p className="mt-3 text-sm leading-7 text-red-600">
                  Your account is not active, so you cannot apply right now.
                </p>
              ) : !currentProfile?.worker_enabled ? (
                <>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    You need worker access before you can apply for jobs.
                  </p>
                  <div className="mt-5">
                    <Link
                      href="/profile"
                      className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
                    >
                      Complete worker profile
                    </Link>
                  </div>
                </>
              ) : job.status !== "open" || job.visibility !== "public" ? (
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  This job is not currently accepting applications.
                </p>
              ) : (
                <div className="mt-5">
                  <ApplyJobButton
                    jobId={job.id}
                    jobTitle={job.title}
                    canApply={canApply}
                    alreadyApplied={alreadyApplied}
                  />
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}