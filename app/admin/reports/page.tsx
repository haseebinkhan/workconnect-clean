import { createClient } from "@/lib/supabase/server";
import ReportActions from "./report-actions";

function statusClasses(status: string) {
  if (status === "resolved") return "bg-emerald-50 text-emerald-700";
  if (status === "reviewing") return "bg-amber-50 text-amber-700";
  if (status === "dismissed") return "bg-red-50 text-red-700";
  return "bg-sky-50 text-sky-700";
}

export default async function AdminReportsPage() {
  const supabase = await createClient();

  const { data: reports, error } = await supabase
    .from("reports")
    .select("id, reporter_id, reported_user_id, booking_id, reason, details, status, created_at")
    .order("created_at", { ascending: false });

  const reporterIds = [...new Set((reports || []).map((r) => r.reporter_id).filter(Boolean))];
  const reportedIds = [...new Set((reports || []).map((r) => r.reported_user_id).filter(Boolean))];
  const userIds = [...new Set([...reporterIds, ...reportedIds])];

  let names: Record<string, string | null> = {};

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    names =
      profiles?.reduce((acc, item) => {
        acc[item.id] = item.full_name;
        return acc;
      }, {} as Record<string, string | null>) || {};
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-bold text-red-700">Could not load reports</h2>
        <p className="mt-2 text-slate-600">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Moderation</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">Reports queue</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Review user-submitted reports and update their moderation status.
        </p>
      </div>

      {reports && reports.length > 0 ? (
        <div className="grid gap-6">
          {reports.map((report) => (
            <article key={report.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClasses(report.status)}`}>
                      {report.status}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(report.created_at).toLocaleString()}
                    </span>
                  </div>

                  <h3 className="mt-4 text-xl font-bold text-slate-900">
                    Reason: {report.reason}
                  </h3>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Reporter</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {names[report.reporter_id] || report.reporter_id}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Reported user</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {report.reported_user_id ? names[report.reported_user_id] || report.reported_user_id : "Not provided"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Details</p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">
                      {report.details || "No extra details provided."}
                    </p>
                  </div>

                  {report.booking_id && (
                    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Booking reference</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {report.booking_id}
                      </p>
                    </div>
                  )}
                </div>

                <div className="w-full max-w-sm">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-medium text-slate-500">Actions</p>
                    <div className="mt-4">
                      <ReportActions reportId={report.id} currentStatus={report.status} />
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h3 className="text-2xl font-bold text-slate-900">No reports yet</h3>
          <p className="mt-3 text-slate-600">User reports will appear here when submitted.</p>
        </div>
      )}
    </div>
  );
}
