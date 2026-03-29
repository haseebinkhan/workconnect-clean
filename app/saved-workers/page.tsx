import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function formatLocation({
  country,
  region,
  city,
  postcodePrefix,
  postcodeFull,
  areaSlug,
}: {
  country?: string | null;
  region?: string | null;
  city?: string | null;
  postcodePrefix?: string | null;
  postcodeFull?: string | null;
  areaSlug?: string | null;
}) {
  const parts = [city, region, country].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  if (postcodePrefix) return postcodePrefix;
  if (postcodeFull) return postcodeFull;
  if (areaSlug) return areaSlug;
  return "Location not specified";
}

function formatRate({
  hourlyRate,
  hourlyRateMin,
  hourlyRateMax,
}: {
  hourlyRate?: number | null;
  hourlyRateMin?: number | null;
  hourlyRateMax?: number | null;
}) {
  if (hourlyRate != null) return `GBP ${hourlyRate}/hr`;
  if (hourlyRateMin != null || hourlyRateMax != null) {
    return `GBP ${hourlyRateMin ?? 0}${hourlyRateMax != null ? ` - ${hourlyRateMax}` : ""}/hr`;
  }
  return "Rate not specified";
}

function initials(name?: string | null) {
  const text = (name || "W").trim();
  return text
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export default async function SavedWorkersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: savedRows, error } = await supabase
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

  const workerUserIds = [...new Set((savedRows || []).map((item) => item.worker_user_id).filter(Boolean))];

  const { data: profiles } = workerUserIds.length
    ? await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          avatar_url,
          country,
          region,
          city,
          postcode_prefix,
          postcode_full
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
          country,
          region,
          city,
          area_slug,
          postcode,
          postcode_prefix,
          postcode_full,
          hourly_rate,
          hourly_rate_min,
          hourly_rate_max,
          rating_avg,
          rating_count,
          jobs_completed,
          is_open_to_work,
          is_public,
          availability_notes
        `)
        .in("user_id", workerUserIds)
    : { data: [] };

  const profileMap = new Map((profiles || []).map((item) => [item.id, item]));
  const workerProfileMap = new Map((workerProfiles || []).map((item) => [item.user_id, item]));

  const savedWorkers = (savedRows || [])
    .map((saved) => {
      const profile = profileMap.get(saved.worker_user_id);
      const worker = workerProfileMap.get(saved.worker_user_id);

      if (!profile || !worker) return null;

      return {
        savedId: saved.id,
        savedAt: saved.created_at,
        workerProfileId: worker.id,
        workerUserId: saved.worker_user_id,
        fullName: profile.full_name || "Worker",
        avatarUrl: profile.avatar_url || null,
        headline: worker.headline || null,
        description: worker.description || null,
        category: worker.category || null,
        country: worker.country || profile.country || "United Kingdom",
        region: worker.region || profile.region || null,
        city: worker.city || profile.city || null,
        areaSlug: worker.area_slug || null,
        postcodePrefix: worker.postcode_prefix || profile.postcode_prefix || null,
        postcodeFull:
          worker.postcode_full ||
          worker.postcode ||
          profile.postcode_full ||
          null,
        hourlyRate: worker.hourly_rate ?? null,
        hourlyRateMin: worker.hourly_rate_min ?? null,
        hourlyRateMax: worker.hourly_rate_max ?? null,
        ratingAvg: worker.rating_avg ?? null,
        ratingCount: worker.rating_count ?? null,
        jobsCompleted: worker.jobs_completed ?? null,
        isOpenToWork: !!worker.is_open_to_work,
        isPublic: !!worker.is_public,
        availabilityNotes: worker.availability_notes || null,
      };
    })
    .filter(Boolean);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">Saved shortlist</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Saved workers
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Keep a shortlist of workers you may want to contact later.
          </p>
        </div>

        {savedWorkers.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">No saved workers yet</h2>
            <p className="mt-2 text-sm text-slate-600">
              Browse workers and save the ones you want to review later.
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
            {savedWorkers.map((worker: any) => {
              const locationText = formatLocation({
                country: worker.country,
                region: worker.region,
                city: worker.city,
                postcodePrefix: worker.postcodePrefix,
                postcodeFull: worker.postcodeFull,
                areaSlug: worker.areaSlug,
              });

              return (
                <article
                  key={worker.savedId}
                  className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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
                        initials(worker.fullName)
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-lg font-bold text-slate-900">
                        {worker.fullName}
                      </h2>
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
                        Location
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {locationText}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Rate
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatRate({
                          hourlyRate: worker.hourlyRate,
                          hourlyRateMin: worker.hourlyRateMin,
                          hourlyRateMax: worker.hourlyRateMax,
                        })}
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
                    {worker.description || worker.availabilityNotes || "No description added yet."}
                  </p>

                  <div className="mt-6 flex gap-3">
                    <Link
                      href={`/workers/${worker.workerProfileId}`}
                      className="flex-1 rounded-2xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                      View worker
                    </Link>

                    <Link
                      href={`/workers/${worker.workerProfileId}`}
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                    >
                      Contact
                    </Link>
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