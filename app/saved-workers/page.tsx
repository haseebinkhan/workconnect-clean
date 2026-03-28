import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SaveWorkerButton from "@/components/workers/SaveWorkerButton";
import { getAreaLabel } from "@/lib/ni-locations";

function formatRate(
  hourlyRate: number | null,
  hourlyRateMin: number | null,
  hourlyRateMax: number | null
) {
  if (hourlyRate != null) return `GBP ${hourlyRate}/hr`;
  if (hourlyRateMin != null || hourlyRateMax != null) {
    return `GBP ${hourlyRateMin ?? 0}${
      hourlyRateMax != null ? ` - ${hourlyRateMax}` : ""
    }/hr`;
  }
  return "Rate not specified";
}

export default async function SavedWorkersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: favorites, error } = await supabase
    .from("favorites")
    .select(`
      id,
      worker_user_id,
      created_at
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-6xl">
          <div className="rounded-[2rem] border border-red-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">Saved workers</h1>
            <p className="mt-3 text-sm text-red-600">
              {error.message || "Could not load saved workers."}
            </p>
          </div>
        </section>
      </main>
    );
  }

  const workerUserIds = [...new Set((favorites || []).map((f) => f.worker_user_id))];

  const { data: profiles } = workerUserIds.length
    ? await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          avatar_url,
          city,
          area_slug,
          is_active
        `)
        .in("id", workerUserIds)
    : { data: [] };

  const { data: workerProfiles } = workerUserIds.length
    ? await supabase
        .from("worker_profiles")
        .select(`
          id,
          user_id,
          headline,
          description,
          category,
          hourly_rate,
          hourly_rate_min,
          hourly_rate_max,
          rating_avg,
          rating_count,
          jobs_completed,
          is_open_to_work
        `)
        .in("user_id", workerUserIds)
    : { data: [] };

  const profileMap = new Map((profiles || []).map((item) => [item.id, item]));
  const workerProfileMap = new Map((workerProfiles || []).map((item) => [item.user_id, item]));

  const rows = (favorites || [])
    .map((favorite) => {
      const profile = profileMap.get(favorite.worker_user_id);
      const workerProfile = workerProfileMap.get(favorite.worker_user_id);

      if (!profile || !workerProfile || !profile.is_active) return null;

      return {
        favoriteId: favorite.id,
        savedAt: favorite.created_at,
        workerUserId: favorite.worker_user_id,
        workerProfileId: workerProfile.id,
        fullName: profile.full_name || "Worker",
        avatarUrl: profile.avatar_url,
        city: profile.city,
        areaSlug: profile.area_slug,
        headline: workerProfile.headline,
        description: workerProfile.description,
        category: workerProfile.category,
        hourlyRate: workerProfile.hourly_rate,
        hourlyRateMin: workerProfile.hourly_rate_min,
        hourlyRateMax: workerProfile.hourly_rate_max,
        ratingAvg: workerProfile.rating_avg,
        ratingCount: workerProfile.rating_count,
        jobsCompleted: workerProfile.jobs_completed,
        isOpenToWork: workerProfile.is_open_to_work,
      };
    })
    .filter(Boolean) as Array<{
      favoriteId: string;
      savedAt: string;
      workerUserId: string;
      workerProfileId: string;
      fullName: string;
      avatarUrl: string | null;
      city: string | null;
      areaSlug: string | null;
      headline: string | null;
      description: string | null;
      category: string | null;
      hourlyRate: number | null;
      hourlyRateMin: number | null;
      hourlyRateMax: number | null;
      ratingAvg: number | null;
      ratingCount: number | null;
      jobsCompleted: number | null;
      isOpenToWork: boolean;
    }>;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-medium text-slate-500">Hirer shortlist</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Saved workers
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Save promising workers while you compare profiles, availability, and rates.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">No saved workers yet</h2>
            <p className="mt-2 text-sm text-slate-600">
              Browse workers and save the ones you may want to contact later.
            </p>
            <div className="mt-6">
              <Link
                href="/workers"
                className="inline-flex rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Browse workers
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((worker) => (
              <article
                key={worker.favoriteId}
                className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-lg font-bold text-indigo-700">
                    {worker.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={worker.avatarUrl}
                        alt={worker.fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      worker.fullName
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0]?.toUpperCase() || "")
                        .join("")
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-bold text-slate-900">
                      {worker.fullName}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-slate-600">
                      {worker.headline || worker.category || "Worker profile"}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {worker.category ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {worker.category}
                        </span>
                      ) : null}
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          worker.isOpenToWork
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {worker.isOpenToWork ? "Open to work" : "Unavailable"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Area
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {getAreaLabel(worker.areaSlug)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Rate
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatRate(worker.hourlyRate, worker.hourlyRateMin, worker.hourlyRateMax)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Rating
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {worker.ratingAvg != null
                        ? `${Number(worker.ratingAvg).toFixed(1)} (${worker.ratingCount ?? 0})`
                        : "No rating yet"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Jobs completed
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {worker.jobsCompleted ?? 0}
                    </p>
                  </div>
                </div>

                <p className="mt-5 line-clamp-3 text-sm leading-7 text-slate-600">
                  {worker.description || "No description added yet."}
                </p>

                <div className="mt-6 flex gap-3">
                  <Link
                    href={`/workers/${worker.workerProfileId}`}
                    className="flex-1 rounded-2xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    View profile
                  </Link>

                  <SaveWorkerButton
                    workerUserId={worker.workerUserId}
                    initiallySaved={true}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
