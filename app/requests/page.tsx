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
    case "cancelled":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "in_progress":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "worker_marked_done":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "completed":
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

function formatLocation({
  country,
  region,
  city,
  postcode,
  areaSlug,
}: {
  country?: string | null;
  region?: string | null;
  city?: string | null;
  postcode?: string | null;
  areaSlug?: string | null;
}) {
  const parts = [city, region, country].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  if (postcode) return postcode;
  if (areaSlug) return areaSlug;
  return "Not specified";
}

export default async function RequestsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, worker_enabled, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_active) {
    redirect("/dashboard");
  }

  if (!profile.worker_enabled) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-5xl">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">Requests</h1>
            <p className="mt-3 text-sm text-slate-600">
              You need worker mode enabled before you can manage work requests.
            </p>
            <div className="mt-6">
              <Link
                href="/profile"
                className="inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
              >
                Update profile
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  await supabase
    .from("bookings")
    .update({ seen_by_worker: true })
    .eq("worker_user_id", user.id)
    .eq("seen_by_worker", false);

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(`
      id,
      title,
      message,
      budget_amount,
      currency_code,
      country,
      region,
      city,
      postcode,
      area_slug,
      preferred_meeting_at,
      status,
      created_at,
      updated_at,
      hirer_user_id,
      worker_user_id,
      deleted_at
    `)
    .eq("worker_user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-5xl">
          <div className="rounded-[2rem] border border-red-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">Requests</h1>
            <p className="mt-3 text-sm text-red-600">
              {error.message || "Could not load requests."}
            </p>
          </div>
        </section>
      </main>
    );
  }

  const hirerUserIds = [...new Set((bookings || []).map((b) => b.hirer_user_id).filter(Boolean))];

  const { data: hirerProfiles } = hirerUserIds.length
    ? await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          phone_number,
          whatsapp_number,
          country,
          region,
          city,
          postcode_prefix,
          postcode_full
        `)
        .in("id", hirerUserIds)
    : { data: [] };

  const hirerMap = new Map((hirerProfiles || []).map((item) => [item.id, item]));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">Worker requests</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Incoming requests
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Review incoming work requests, check the meeting time and location,
            then accept or cancel from the request thread.
          </p>
        </div>

        {!bookings || bookings.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">No requests yet</h2>
            <p className="mt-2 text-sm text-slate-600">
              When hirers send you work requests, they will appear here.
            </p>
            <div className="mt-6">
              <Link
                href="/workers"
                className="inline-flex rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                View worker marketplace
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {bookings.map((booking) => {
              const hirer = hirerMap.get(booking.hirer_user_id);

              const requestLocation = formatLocation({
                country: booking.country,
                region: booking.region,
                city: booking.city,
                postcode: booking.postcode,
                areaSlug: booking.area_slug,
              });

              return (
                <article
                  key={booking.id}
                  className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-bold text-slate-900">
                          {booking.title || "Work request"}
                        </h2>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusClasses(
                            booking.status
                          )}`}
                        >
                          {booking.status || "pending"}
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-slate-500">
                        Sent on {formatDateTime(booking.created_at)}
                      </p>

                      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-sm text-slate-500">From</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {hirer?.full_name || "Hirer"}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-sm text-slate-500">Meeting time</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {booking.preferred_meeting_at
                              ? formatDateTime(booking.preferred_meeting_at)
                              : "Not specified"}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-sm text-slate-500">Location</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {requestLocation}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-sm text-slate-500">Budget</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {booking.budget_amount != null
                              ? `${booking.currency_code || "GBP"} ${booking.budget_amount}`
                              : "Not specified"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 rounded-[1.5rem] bg-slate-50 p-5">
                        <p className="text-sm font-semibold text-slate-700">
                          Request message
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                          {booking.message || "No message provided."}
                        </p>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <Link
                          href={`/messages/${booking.id}`}
                          className="inline-flex rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                        >
                          Open request thread
                        </Link>

                        <Link
                          href="/messages"
                          className="inline-flex rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                        >
                          View all messages
                        </Link>
                      </div>
                    </div>

                    <div className="w-full lg:max-w-xs">
                      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                        <h3 className="text-base font-bold text-slate-900">
                          Hirer details
                        </h3>

                        <div className="mt-4 space-y-2 text-sm text-slate-700">
                          <p>
                            <span className="font-semibold text-slate-900">Name:</span>{" "}
                            {hirer?.full_name || "Not provided"}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-900">Email:</span>{" "}
                            {hirer?.email || "Not provided"}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-900">Phone:</span>{" "}
                            {hirer?.phone_number || "Not provided"}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-900">WhatsApp:</span>{" "}
                            {hirer?.whatsapp_number || "Not provided"}
                          </p>
                        </div>

                        <div className="mt-5 rounded-2xl bg-white p-4">
                          <p className="text-sm font-semibold text-slate-900">
                            Current status
                          </p>
                          <p className="mt-2 text-sm text-slate-600">
                            Accept, cancel, and booking progress actions are handled
                            inside the request conversation.
                          </p>
                        </div>
                      </div>
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
