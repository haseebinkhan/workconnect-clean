import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

function getNotificationHref(item: {
  type: string;
  meta: any;
}) {
  const meta = item.meta || {};

  if (meta.booking_id) {
    return `/messages/${meta.booking_id}`;
  }

  if (meta.job_id && meta.application_id) {
    return `/my-job-posts?job=${meta.job_id}&application=${meta.application_id}`;
  }

  if (meta.job_id) {
    return `/jobs/${meta.job_id}`;
  }

  if (item.type?.includes("application")) {
    return "/my-job-posts";
  }

  if (item.type?.includes("booking") || item.type?.includes("request")) {
    return "/my-requests";
  }

  if (item.type === "message") {
    return "/messages";
  }

  return "/dashboard";
}

export default async function NotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select(`
      id,
      type,
      title,
      body,
      is_read,
      meta,
      created_at
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-5xl">
          <div className="rounded-[2rem] border border-red-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
            <p className="mt-3 text-sm text-red-600">
              {error.message || "Could not load notifications."}
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">Activity</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Notifications
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Review your recent messages, applications, requests, and system updates.
          </p>
        </div>

        {!notifications || notifications.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">No notifications yet</h2>
            <p className="mt-2 text-sm text-slate-600">
              When something important happens, it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((item) => {
              const href = getNotificationHref(item);

              return (
                <Link
                  key={item.id}
                  href={href}
                  className="block rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-bold text-slate-900">
                          {item.title || "Notification"}
                        </h2>

                        {!item.is_read ? (
                          <span className="rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
                            New
                          </span>
                        ) : null}

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                          {item.type || "system"}
                        </span>
                      </div>

                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        {item.body || "Open to view more details."}
                      </p>
                    </div>

                    <div className="shrink-0 text-sm text-slate-500">
                      {formatDateTime(item.created_at)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
