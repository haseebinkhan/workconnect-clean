import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

function statusClasses(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "accepted":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "rejected":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

function safeExternalUrl(url?: string | null) {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }

  return null;
}

export default async function MyApplicationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: workerProfile, error: workerProfileError } = await supabase
    .from("worker_profiles")
    .select("id, user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (workerProfileError || !workerProfile?.id) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-4xl">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">My applications</h1>
            <p className="mt-3 text-sm text-slate-600">
              You need a worker profile before you can track applications.
            </p>
            <div className="mt-6">
              <Link
                href="/become-worker"
                className="inline-flex rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Complete worker profile
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  await supabase
    .from("job_applications")
    .update({ seen_by_worker: true })
    .eq("worker_id", workerProfile.id)
    .eq("seen_by_worker", false);

  const { data: applications, error: applicationsError } = await supabase
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
      availability_type,
      start_date,
      portfolio_url,
      linkedin_url,
      cv_url,
      seen_by_worker
    `)
    .eq("worker_id", workerProfile.id)
    .order("created_at", { ascending: false });

  if (applicationsError) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-5xl">
          <div className="rounded-[2rem] border border-red-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">My applications</h1>
            <p className="mt-3 text-sm text-red-600">
              {applicationsError.message || "Could not load applications."}
            </p>
          </div>
        </section>
      </main>
    );
  }

  const jobIds = (applications || []).map((item) => item.job_id);

  const { data: jobs } = jobIds.length
    ? await supabase
        .from("jobs")
        .select(`
          id,
          hirer_id,
          title,
          description,
          status,
          city,
          area_slug,
          currency_code,
          budget_min,
          budget_max,
          deleted_at
        `)
        .in("id", jobIds)
    : { data: [] };

  const jobMap = new Map((jobs || []).map((job) => [job.id, job]));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">Jobs</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            My applications
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Track the status of the jobs you have applied for.
          </p>
        </div>

        {!applications || applications.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">No applications yet</h2>
            <p className="mt-2 text-sm text-slate-600">
              Browse open jobs and submit your first application.
            </p>
            <div className="mt-6">
              <Link
                href="/jobs"
                className="inline-flex rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Browse jobs
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {applications.map((application) => {
              const job = jobMap.get(application.job_id);
              const isAccepted = application.status === "accepted";
              const isRejected = application.status === "rejected";

              const portfolioUrl = safeExternalUrl(application.portfolio_url);
              const linkedinUrl = safeExternalUrl(application.linkedin_url);
              const cvUrl = safeExternalUrl(application.cv_url);

              return (
                <article
                  key={application.id}
                  className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-bold text-slate-900">
                          {job?.title || "Job no longer available"}
                        </h2>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusClasses(
                            application.status
                          )}`}
                        >
                          {application.status || "pending"}
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-slate-500">
                        Applied on {formatDateTime(application.created_at)}
                      </p>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-sm text-slate-500">Location</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {job?.city || job?.area_slug || "Not specified"}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-sm text-slate-500">Proposed rate</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {application.proposed_rate != null
                              ? `${application.currency_code || "GBP"} ${application.proposed_rate}`
                              : "Not provided"}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-sm text-slate-500">Availability</p>
                          <p className="mt-1 text-sm font-semibold capitalize text-slate-900">
                            {application.availability_type || "Not provided"}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-sm text-slate-500">Start date</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {application.start_date || "Flexible"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-700">
                          Your cover message
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                          {application.cover_message || "No message added."}
                        </p>
                      </div>

                      {portfolioUrl || linkedinUrl || cvUrl ? (
                        <div className="mt-4 flex flex-wrap gap-3">
                          {portfolioUrl ? (
                            <a
                              href={portfolioUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                            >
                              View portfolio
                            </a>
                          ) : null}

                          {linkedinUrl ? (
                            <a
                              href={linkedinUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                            >
                              View LinkedIn
                            </a>
                          ) : null}

                          {cvUrl ? (
                            <a
                              href={cvUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                            >
                              View CV
                            </a>
                          ) : null}
                        </div>
                      ) : null}

                      {application.cv_url && !cvUrl ? (
                        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                          Your saved CV link is not valid. Re-upload your CV to fix it.
                        </div>
                      ) : null}

                      {isAccepted ? (
                        <div className="mt-6 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5">
                          <h3 className="text-base font-bold text-emerald-900">
                            Application accepted
                          </h3>
                          <p className="mt-2 text-sm text-emerald-800">
                            The hirer accepted your application. Continue in requests or messages.
                          </p>

                          <div className="mt-4 flex flex-wrap gap-3">
                            <Link
                              href="/requests"
                              className="inline-flex rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                            >
                              View requests
                            </Link>

                            <Link
                              href="/messages"
                              className="inline-flex rounded-2xl border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                            >
                              Open messages
                            </Link>
                          </div>
                        </div>
                      ) : null}

                      {isRejected ? (
                        <div className="mt-6 rounded-[1.5rem] border border-red-200 bg-red-50 p-5">
                          <h3 className="text-base font-bold text-red-900">
                            Application not selected
                          </h3>
                          <p className="mt-2 text-sm text-red-800">
                            This application was not accepted. You can continue applying to other jobs.
                          </p>
                        </div>
                      ) : null}
                    </div>
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