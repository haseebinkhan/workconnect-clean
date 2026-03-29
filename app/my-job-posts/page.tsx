import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import JobApplicationActions from "@/components/JobApplicationActions";

type SearchParamsType = Promise<{
  job?: string;
  application?: string;
}>;

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

function compactText(value?: string | null, max = 220) {
  const text = (value || "").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

function jobStatusClasses(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "open":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "pending":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "paused":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "rejected":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "closed":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function appStatusClasses(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "accepted":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "rejected":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
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

function formatLocation(input: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
  postcode?: string | null;
  area_slug?: string | null;
}) {
  const parts = [input.city, input.region, input.country].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  if (input.postcode) return input.postcode;
  if (input.area_slug) return input.area_slug;
  return "Local area";
}

export default async function MyJobPostsPage({
  searchParams,
}: {
  searchParams?: SearchParamsType;
}) {
  const params = (await searchParams) || {};
  const highlightJobId = params.job || "";
  const highlightApplicationId = params.application || "";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: hirerProfile, error: hirerProfileError } = await supabase
    .from("hirer_profiles")
    .select("id, company_name, contact_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (hirerProfileError || !hirerProfile?.id) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-5xl">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">My job posts</h1>
            <p className="mt-3 text-sm text-slate-600">
              A hirer profile is required before you can manage job posts.
            </p>
            <div className="mt-6">
              <Link
                href="/profile"
                className="inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
              >
                Complete profile
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select(`
      id,
      title,
      description,
      status,
      budget_min,
      budget_max,
      currency_code,
      location_type,
      country,
      region,
      city,
      postcode,
      area_slug,
      created_at,
      updated_at,
      deleted_at
    `)
    .eq("hirer_id", hirerProfile.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (jobsError) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-5xl">
          <div className="rounded-[2rem] border border-red-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">My job posts</h1>
            <p className="mt-3 text-sm text-red-600">
              {jobsError.message || "Could not load jobs."}
            </p>
          </div>
        </section>
      </main>
    );
  }

  const jobIds = (jobs || []).map((job) => job.id);

  const { data: applications } = jobIds.length
    ? await supabase
        .from("job_applications")
        .select(`
          id,
          job_id,
          worker_id,
          cover_message,
          proposed_rate,
          currency_code,
          status,
          created_at,
          updated_at,
          phone,
          availability_type,
          start_date,
          portfolio_url,
          linkedin_url,
          cv_url
        `)
        .in("job_id", jobIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const workerProfileIds = [
    ...new Set((applications || []).map((item) => item.worker_id).filter(Boolean)),
  ];

  const { data: workerProfiles } = workerProfileIds.length
    ? await supabase
        .from("worker_profiles")
        .select(`
          id,
          user_id,
          headline,
          description,
          category,
          country,
          city,
          postcode,
          area_slug,
          hourly_rate,
          rating_avg,
          rating_count,
          jobs_completed,
          availability_notes
        `)
        .in("id", workerProfileIds)
    : { data: [] };

  const workerUserIds = [
    ...new Set((workerProfiles || []).map((item) => item.user_id).filter(Boolean)),
  ];

  const { data: profiles } = workerUserIds.length
    ? await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          country,
          region,
          city,
          postcode,
          area_slug
        `)
        .in("id", workerUserIds)
    : { data: [] };

  const workerMap = new Map((workerProfiles || []).map((item) => [item.id, item]));
  const profileMap = new Map((profiles || []).map((item) => [item.id, item]));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Hiring</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                My job posts
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                Review applications with both the worker profile and the application details.
              </p>
            </div>

            <Link
              href="/post-job"
              className="inline-flex rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Post a new job
            </Link>
          </div>
        </div>

        {!jobs || jobs.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">No job posts yet</h2>
            <p className="mt-2 text-sm text-slate-600">
              Create your first job to start receiving applications.
            </p>
            <div className="mt-6">
              <Link
                href="/post-job"
                className="inline-flex rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Post a job
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {jobs.map((job) => {
              const jobApps = (applications || []).filter((app) => app.job_id === job.id);

              return (
                <article
                  key={job.id}
                  className={`rounded-[2rem] border bg-white p-6 shadow-sm ${
                    highlightJobId === job.id
                      ? "border-indigo-400 ring-2 ring-indigo-100"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-bold text-slate-900">{job.title}</h2>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${jobStatusClasses(
                        job.status
                      )}`}
                    >
                      {job.status}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {compactText(job.description, 260) || "No description provided."}
                  </p>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
                        {job.location_type?.replaceAll("_", " ") || "Not specified"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Budget</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatBudget(job.budget_min, job.budget_max, job.currency_code)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Applications</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {jobApps.length}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Posted</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatDateTime(job.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 space-y-5">
                    {jobApps.length === 0 ? (
                      <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                        <h3 className="text-lg font-bold text-slate-900">No applications yet</h3>
                        <p className="mt-2 text-sm text-slate-600">
                          When workers apply, they will appear here.
                        </p>
                      </div>
                    ) : (
                      jobApps.map((application) => {
                        const worker = workerMap.get(application.worker_id);
                        const profile = worker?.user_id
                          ? profileMap.get(worker.user_id)
                          : null;

                        const workerLocation = formatLocation({
                          city: worker?.city || profile?.city,
                          region: profile?.region,
                          country: worker?.country || profile?.country || "United Kingdom",
                          postcode: worker?.postcode || profile?.postcode,
                          area_slug: worker?.area_slug || profile?.area_slug,
                        });

                        return (
                          <div
                            key={application.id}
                            className={`rounded-[1.75rem] border bg-slate-50 p-5 ${
                              highlightApplicationId === application.id
                                ? "border-indigo-400 ring-2 ring-indigo-100"
                                : "border-slate-200"
                            }`}
                          >
                            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                              <div className="min-w-0 flex-1 space-y-5">
                                <div className="flex flex-wrap items-center gap-3">
                                  <h4 className="text-xl font-bold text-slate-900">
                                    {profile?.full_name || "Worker"}
                                  </h4>

                                  <span
                                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${appStatusClasses(
                                      application.status
                                    )}`}
                                  >
                                    {application.status}
                                  </span>
                                </div>

                                <p className="text-sm text-slate-500">
                                  Applied on {formatDateTime(application.created_at)}
                                </p>

                                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                  <div className="rounded-2xl bg-white p-4">
                                    <p className="text-sm text-slate-500">Headline</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-900">
                                      {worker?.headline || "Not provided"}
                                    </p>
                                  </div>

                                  <div className="rounded-2xl bg-white p-4">
                                    <p className="text-sm text-slate-500">Category</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-900">
                                      {worker?.category || "Not provided"}
                                    </p>
                                  </div>

                                  <div className="rounded-2xl bg-white p-4">
                                    <p className="text-sm text-slate-500">Location</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-900">
                                      {workerLocation}
                                    </p>
                                    {worker?.postcode || profile?.postcode ? (
                                      <p className="mt-1 text-xs text-slate-500">
                                        {worker?.postcode || profile?.postcode}
                                      </p>
                                    ) : null}
                                  </div>

                                  <div className="rounded-2xl bg-white p-4">
                                    <p className="text-sm text-slate-500">Applied rate</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-900">
                                      {application.proposed_rate != null
                                        ? `${application.currency_code || "GBP"} ${application.proposed_rate}`
                                        : worker?.hourly_rate != null
                                        ? `${job.currency_code || "GBP"} ${worker.hourly_rate} / hr`
                                        : "Not provided"}
                                    </p>
                                  </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                  <div className="rounded-2xl bg-white p-4">
                                    <p className="text-sm text-slate-500">Jobs completed</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-900">
                                      {worker?.jobs_completed ?? 0}
                                    </p>
                                  </div>

                                  <div className="rounded-2xl bg-white p-4">
                                    <p className="text-sm text-slate-500">Rating</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-900">
                                      {worker?.rating_avg != null
                                        ? `${Number(worker.rating_avg).toFixed(1)} (${worker?.rating_count ?? 0})`
                                        : "No rating yet"}
                                    </p>
                                  </div>

                                  <div className="rounded-2xl bg-white p-4">
                                    <p className="text-sm text-slate-500">Availability</p>
                                    <p className="mt-1 text-sm font-semibold capitalize text-slate-900">
                                      {application.availability_type ||
                                        worker?.availability_notes ||
                                        "Not provided"}
                                    </p>
                                  </div>

                                  <div className="rounded-2xl bg-white p-4">
                                    <p className="text-sm text-slate-500">Start date</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-900">
                                      {application.start_date || "Flexible"}
                                    </p>
                                  </div>
                                </div>

                                <div className="rounded-[1.5rem] bg-white p-5">
                                  <p className="text-sm font-semibold text-slate-700">
                                    Worker profile summary
                                  </p>
                                  <p className="mt-2 text-sm leading-7 text-slate-600">
                                    {worker?.description
                                      ? compactText(worker.description, 300)
                                      : "No profile description added."}
                                  </p>
                                </div>

                                <div className="rounded-[1.5rem] bg-white p-5">
                                  <p className="text-sm font-semibold text-slate-700">
                                    Application message
                                  </p>
                                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                                    {application.cover_message || "No extra message added."}
                                  </p>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                  <Link
                                    href={`/workers/${worker?.id}`}
                                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                                  >
                                    View worker profile
                                  </Link>

                                  {application.linkedin_url ? (
                                    <a
                                      href={application.linkedin_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                                    >
                                      LinkedIn
                                    </a>
                                  ) : null}

                                  {application.portfolio_url ? (
                                    <a
                                      href={application.portfolio_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                                    >
                                      Portfolio
                                    </a>
                                  ) : null}

                                  {application.cv_url ? (
                                    <a
                                      href={application.cv_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                                    >
                                      CV
                                    </a>
                                  ) : null}
                                </div>
                              </div>

                              <div className="w-full xl:max-w-xs">
                                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                                  <h5 className="text-base font-bold text-slate-900">Decision</h5>
                                  <p className="mt-2 text-sm text-slate-600">
                                    Review this worker and choose the next step.
                                  </p>

                                  <div className="mt-4">
                                    <JobApplicationActions
                                      applicationId={application.id}
                                      currentStatus={application.status}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

