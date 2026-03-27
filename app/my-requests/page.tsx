import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HirerRequestActions from "./hirer-request-actions";
import BookingProgressActions from "@/components/bookings/BookingProgressActions";
import { formatDateTime, isUpcoming } from "@/lib/date-utils";
import ReviewForm from "@/components/reviews/ReviewForm";

function statusClasses(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "accepted":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "in_progress":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "worker_marked_done":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "completed":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "cancelled":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

export default async function MyRequestsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: requests, error } = await supabase
    .from("bookings")
    .select(`
      id,
      title,
      message,
      budget_amount,
      currency_code,
      city,
      area_slug,
      start_date,
      preferred_meeting_at,
      status,
      hirer_user_id,
      worker_user_id,
      created_at,
      updated_at,
      deleted_at
    `)
    .eq("hirer_user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8">
        <section className="mx-auto max-w-6xl">
          <div className="rounded-[2rem] border border-red-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">My requests</h1>
            <p className="mt-3 text-sm text-red-600">
              {error.message || "Could not load your requests."}
            </p>
          </div>
        </section>
      </main>
    );
  }

  const workerIds = [...new Set((requests || []).map((item) => item.worker_user_id))];

  const { data: workers } = workerIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, city")
        .in("id", workerIds)
    : { data: [] };

  const workerMap = new Map((workers || []).map((item) => [item.id, item]));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-medium text-slate-500">Hirer dashboard</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            My requests
          </h1>
        </div>

        {!requests || requests.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">No requests sent yet</h2>
            <p className="mt-2 text-sm text-slate-600">
              Browse worker profiles and send a request when you find the right person.
            </p>
            <div className="mt-6">
              <Link
                href="/workers"
                className="inline-flex rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Find workers
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {requests.map((request) => {
              const worker = workerMap.get(request.worker_user_id);

              return (
                <article
                  key={request.id}
                  className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-bold text-slate-900">
                          {request.title}
                        </h2>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusClasses(
                            request.status
                          )}`}
                        >
                          {request.status}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-500">
                        To {worker?.full_name || "Worker"} • {formatDateTime(request.created_at)}
                      </p>

                      <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
                          Your proposed meeting
                        </p>
                        <p className="mt-1 text-sm font-semibold text-indigo-900">
                          {formatDateTime(request.preferred_meeting_at)}
                        </p>
                        {isUpcoming(request.preferred_meeting_at) ? (
                          <p className="mt-1 text-xs text-indigo-600">Upcoming</p>
                        ) : (
                          <p className="mt-1 text-xs text-slate-500">Already passed</p>
                        )}
                      </div>

                      <div className="mt-5 rounded-[1.5rem] bg-slate-50 p-5">
                        <p className="text-sm font-semibold text-slate-700">
                          Your request message
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                          {request.message || "No message provided."}
                        </p>
                      </div>
                    </div>

                    <div className="w-full lg:max-w-xs">
                      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                        <h3 className="text-lg font-bold text-slate-900">Actions</h3>

                        <div className="mt-4 space-y-3">
                          {request.status === "pending" ? (
                            <HirerRequestActions bookingId={request.id} currentStatus={request.status} />
                          ) : (
                            <BookingProgressActions
                              bookingId={request.id}
                              currentStatus={request.status}
                              role="hirer"
                            />
                          )}

                          <Link
                            href={`/messages/${request.id}`}
                            className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                          >
                            Open chat
                          </Link>
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