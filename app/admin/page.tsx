import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminJobAction, AdminUserAction } from "@/components/admin/AdminActions";
import ProcessEmailQueueButton from "@/components/admin/ProcessEmailQueueButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  is_active: boolean | null;
  is_admin: boolean | null;
  role: string | null;
  worker_enabled: boolean | null;
  hirer_enabled: boolean | null;
  created_at: string;
};

type JobRow = {
  id: string;
  hirer_id: string | null;
  category: string | null;
  title: string | null;
  title_slug: string | null;
  description: string | null;
  status: string | null;
  visibility: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  postcode: string | null;
  postcode_prefix: string | null;
  postcode_full: string | null;
  area_slug: string | null;
  location_type: string | null;
  budget_min: number | null;
  budget_max: number | null;
  currency_code: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
};

type BookingRow = {
  id: string;
  title: string | null;
  status: string | null;
  created_at: string;
};

type ReportRow = {
  id: string;
  reason: string | null;
  details: string | null;
  status: string | null;
  created_at: string;
};

type HirerProfileRow = {
  id: string;
  user_id: string;
  company_name: string | null;
  contact_name: string | null;
  industry: string | null;
};

function formatDateSafe(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClasses(status?: string | null) {
  const value = (status || "").toLowerCase();

  if (value === "pending") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (value === "open" || value === "active")
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (value === "paused") return "bg-slate-100 text-slate-700 ring-slate-200";
  if (value === "rejected") return "bg-rose-50 text-rose-700 ring-rose-200";
  if (value === "closed") return "bg-indigo-50 text-indigo-700 ring-indigo-200";

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function compactText(value?: string | null, max = 220) {
  const text = (value || "").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

function formatLocation({
  country,
  region,
  city,
  postcode,
  postcodePrefix,
  postcodeFull,
  areaSlug,
}: {
  country?: string | null;
  region?: string | null;
  city?: string | null;
  postcode?: string | null;
  postcodePrefix?: string | null;
  postcodeFull?: string | null;
  areaSlug?: string | null;
}) {
  const parts = [city, region, country].filter(Boolean);
  const base = parts.join(", ");

  if (postcodeFull) {
    return base ? `${base} (${postcodeFull})` : postcodeFull;
  }

  if (postcodePrefix) {
    return base ? `${base} (${postcodePrefix})` : postcodePrefix;
  }

  if (postcode) {
    return base ? `${base} (${postcode})` : postcode;
  }

  return base || areaSlug || "Local area";
}

function formatBudget({
  min,
  max,
  currencyCode,
}: {
  min?: number | null;
  max?: number | null;
  currencyCode?: string | null;
}) {
  const currency = currencyCode || "GBP";

  if (min != null && max != null) {
    return `${currency} ${min} - ${max}`;
  }

  if (min != null) {
    return `${currency} ${min}+`;
  }

  if (max != null) {
    return `Up to ${currency} ${max}`;
  }

  return "Not specified";
}

function formatWorkType(value?: string | null) {
  if (!value) return "Not specified";
  if (value === "local") return "Local / on-site";
  return value.replaceAll("_", " ");
}

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("id, is_admin, role")
    .eq("id", user.id)
    .single();

  const isAdmin =
    !!adminProfile &&
    (adminProfile.is_admin === true || adminProfile.role === "admin");

  if (!isAdmin) {
    redirect("/dashboard");
  }

  const [{ data: users }, { data: jobs }, { data: bookings }, { data: reports }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, full_name, email, is_active, is_admin, role, worker_enabled, hirer_enabled, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(12),

      supabase
        .from("jobs")
        .select(
          `
          id,
          hirer_id,
          category,
          title,
          title_slug,
          description,
          status,
          visibility,
          country,
          region,
          city,
          postcode,
          postcode_prefix,
          postcode_full,
          area_slug,
          location_type,
          budget_min,
          budget_max,
          currency_code,
          expires_at,
          created_at,
          updated_at,
          deleted_at
        `
        )
        .order("created_at", { ascending: false })
        .limit(24),

      supabase
        .from("bookings")
        .select("id, title, status, created_at")
        .order("created_at", { ascending: false })
        .limit(12),

      supabase
        .from("reports")
        .select("id, reason, details, status, created_at")
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

  const userRows = (users || []) as ProfileRow[];
  const jobRows = (jobs || []) as JobRow[];
  const bookingRows = (bookings || []) as BookingRow[];
  const reportRows = (reports || []) as ReportRow[];

  const hirerIds = [...new Set(jobRows.map((job) => job.hirer_id).filter(Boolean))] as string[];

  let hirerNameMap: Record<string, string> = {};
  let hirerIndustryMap: Record<string, string> = {};

  if (hirerIds.length > 0) {
    const { data: hirers } = await supabase
      .from("hirer_profiles")
      .select("id, user_id, company_name, contact_name, industry")
      .in("id", hirerIds);

    const rows = (hirers || []) as HirerProfileRow[];

    hirerNameMap = rows.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = item.company_name || item.contact_name || "Hirer";
      return acc;
    }, {});

    hirerIndustryMap = rows.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = item.industry || "";
      return acc;
    }, {});
  }

  const pendingJobs = jobRows.filter((job) => (job.status || "") === "pending");
  const reviewedJobs = jobRows.filter((job) => (job.status || "") !== "pending");

  const totalUsers = userRows.length;
  const totalJobs = jobRows.length;
  const totalBookings = bookingRows.length;
  const totalReports = reportRows.length;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Admin control center</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                Admin & moderation
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Review pending jobs first, approve or reject listings, pause live
                posts when needed, and monitor users, reports, and bookings.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Users</p>
            <p className="mt-3 text-3xl font-black text-slate-900">{totalUsers}</p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Jobs loaded</p>
            <p className="mt-3 text-3xl font-black text-slate-900">{totalJobs}</p>
          </div>

          <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <p className="text-sm text-amber-700">Pending review</p>
            <p className="mt-3 text-3xl font-black text-amber-900">{pendingJobs.length}</p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Reports</p>
            <p className="mt-3 text-3xl font-black text-slate-900">{totalReports}</p>
          </div>
        </div>

        <div className="mt-8">
          <ProcessEmailQueueButton />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Other jobs</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  Recently reviewed / active jobs
                </h2>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {reviewedJobs.length > 0 ? (
                reviewedJobs.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900">
                            {item.title || "Untitled job"}
                          </h3>

                          {item.category ? (
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                              {item.category}
                            </span>
                          ) : null}

                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${statusClasses(
                              item.status
                            )}`}
                          >
                            {item.status || "unknown"}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-slate-600">
                          {formatLocation({
                            country: item.country,
                            region: item.region,
                            city: item.city,
                            postcode: item.postcode,
                            postcodePrefix: item.postcode_prefix,
                            postcodeFull: item.postcode_full,
                            areaSlug: item.area_slug,
                          })}
                        </p>

                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {compactText(item.description) || "No description provided."}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                            {formatWorkType(item.location_type)}
                          </span>
                          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                            {formatBudget({
                              min: item.budget_min,
                              max: item.budget_max,
                              currencyCode: item.currency_code,
                            })}
                          </span>
                          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                            Posted {formatDateSafe(item.created_at)}
                          </span>
                        </div>
                      </div>

                      <AdminJobAction
                        adminUserId={user.id}
                        jobId={item.id}
                        currentStatus={item.status || "pending"}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-600">
                  No reviewed jobs found.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">User moderation</p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">Recent users</h2>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {userRows.length > 0 ? (
                  userRows.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-900">
                              {item.full_name || "User"}
                            </h3>

                            {(item.is_admin || item.role === "admin") && (
                              <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
                                Admin
                              </span>
                            )}

                            {item.is_active ? (
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                Active
                              </span>
                            ) : (
                              <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                                Suspended
                              </span>
                            )}
                          </div>

                          <p className="mt-2 text-sm text-slate-600">
                            {item.email || "No email"}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                            {item.worker_enabled && (
                              <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                                Worker
                              </span>
                            )}
                            {item.hirer_enabled && (
                              <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                                Hirer
                              </span>
                            )}
                            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                              Joined {formatDateSafe(item.created_at)}
                            </span>
                          </div>
                        </div>

                        {item.id !== user.id &&
                          !item.is_admin &&
                          item.role !== "admin" && (
                            <AdminUserAction
                              adminUserId={user.id}
                              targetUserId={item.id}
                              targetUserName={item.full_name || "User"}
                              isActive={!!item.is_active}
                            />
                          )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-600">
                    No users found.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <p className="text-sm font-medium text-slate-500">Moderation queue</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">Recent reports</h2>
              </div>

              <div className="mt-6 space-y-4">
                {reportRows.length > 0 ? (
                  reportRows.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">
                            {item.reason || "Report"}
                          </h3>
                          <p className="mt-2 text-sm text-slate-600">
                            {item.details || "No extra details."}
                          </p>
                          <p className="mt-2 text-xs text-slate-500">
                            {formatDateSafe(item.created_at)}
                          </p>
                        </div>

                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                          {item.status || "open"}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-600">
                    No reports found.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <p className="text-sm font-medium text-slate-500">Booking monitor</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">Recent bookings</h2>
              </div>

              <div className="mt-6 space-y-4">
                {bookingRows.length > 0 ? (
                  bookingRows.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">
                            {item.title || "Booking"}
                          </h3>
                          <p className="mt-2 text-xs text-slate-500">
                            {formatDateSafe(item.created_at)}
                          </p>
                        </div>

                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                          {item.status || "unknown"}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-600">
                    No bookings found.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <div className="rounded-[2rem] border border-amber-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">Priority queue</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  Jobs pending review
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  These jobs were submitted for admin review and should be checked first.
                </p>
              </div>

              <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
                {pendingJobs.length} pending
              </div>
            </div>

            <div className="mt-6 space-y-5">
              {pendingJobs.length > 0 ? (
                pendingJobs.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-[1.75rem] border border-amber-200 bg-amber-50/40 p-5"
                  >
                    <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-2xl font-bold text-slate-900">
                            {item.title || "Untitled job"}
                          </h3>

                          {item.category ? (
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                              {item.category}
                            </span>
                          ) : null}

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusClasses(
                              item.status
                            )}`}
                          >
                            {item.status || "unknown"}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <p className="text-sm text-slate-500">Hirer</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {item.hirer_id ? hirerNameMap[item.hirer_id] || "Hirer" : "Hirer"}
                            </p>
                            {item.hirer_id && hirerIndustryMap[item.hirer_id] ? (
                              <p className="mt-1 text-xs text-slate-500">
                                {hirerIndustryMap[item.hirer_id]}
                              </p>
                            ) : null}
                          </div>

                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <p className="text-sm text-slate-500">Location</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {formatLocation({
                                country: item.country,
                                region: item.region,
                                city: item.city,
                                postcode: item.postcode,
                                postcodePrefix: item.postcode_prefix,
                                postcodeFull: item.postcode_full,
                                areaSlug: item.area_slug,
                              })}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <p className="text-sm text-slate-500">Work type</p>
                            <p className="mt-1 text-sm font-semibold capitalize text-slate-900">
                              {formatWorkType(item.location_type)}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <p className="text-sm text-slate-500">Budget</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {formatBudget({
                                min: item.budget_min,
                                max: item.budget_max,
                                currencyCode: item.currency_code,
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 rounded-[1.5rem] bg-white p-5 ring-1 ring-slate-200">
                          <p className="text-sm font-semibold text-slate-700">
                            Job description
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                            {item.description?.trim() || "No description provided."}
                          </p>
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <p className="text-sm text-slate-500">Visibility</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {item.visibility || "Not specified"}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <p className="text-sm text-slate-500">Submitted</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {formatDateSafe(item.created_at)}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <p className="text-sm text-slate-500">Updated</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {formatDateSafe(item.updated_at) || "Not yet updated"}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <p className="text-sm text-slate-500">Expires</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {formatDateSafe(item.expires_at) || "Will be set on approval"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="w-full xl:max-w-xs">
                        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                          <p className="text-sm font-medium text-slate-500">Review actions</p>
                          <div className="mt-4">
                            <AdminJobAction
                              adminUserId={user.id}
                              jobId={item.id}
                              currentStatus={item.status || "pending"}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-8 text-center">
                  <h3 className="text-xl font-bold text-slate-900">No pending jobs</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    New job submissions waiting for review will appear here first.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}