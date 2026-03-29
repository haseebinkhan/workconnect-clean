import { createClient } from "@/lib/supabase/server";
import WorkersSearchClient from "./WorkersSearchClient";

type WorkerItem = {
  id: string;
  user_id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  headline?: string | null;
  description?: string | null;
  category?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  area_slug?: string | null;
  postcode?: string | null;
  postcode_prefix?: string | null;
  postcode_full?: string | null;
  hourly_rate?: number | null;
  hourly_rate_min?: number | null;
  hourly_rate_max?: number | null;
  rating_avg?: number | null;
  rating_count?: number | null;
  jobs_completed?: number | null;
  is_open_to_work?: boolean | null;
  is_public?: boolean | null;
  availability_notes?: string | null;
};

export default async function WorkersPage() {
  const supabase = await createClient();

  const { data: workerProfiles, error } = await supabase
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
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  const userIds = [
    ...new Set((workerProfiles || []).map((item) => item.user_id).filter(Boolean)),
  ];

  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          avatar_url
        `)
        .in("id", userIds)
    : {
        data: [] as Array<{
          id: string;
          full_name: string | null;
          avatar_url: string | null;
        }>,
      };

  const profileMap = new Map((profiles || []).map((item) => [item.id, item]));

  const initialWorkers: WorkerItem[] = (workerProfiles || []).map((worker) => {
    const profile = profileMap.get(worker.user_id);

    return {
      id: worker.id,
      user_id: worker.user_id,
      full_name: profile?.full_name || null,
      avatar_url: profile?.avatar_url || null,
      headline: worker.headline || null,
      description: worker.description || null,
      category: worker.category || null,
      country: worker.country || "United Kingdom",
      region: worker.region || null,
      city: worker.city || null,
      area_slug: worker.area_slug || null,
      postcode: worker.postcode || null,
      postcode_prefix: worker.postcode_prefix || null,
      postcode_full: worker.postcode_full || null,
      hourly_rate: worker.hourly_rate ?? null,
      hourly_rate_min: worker.hourly_rate_min ?? null,
      hourly_rate_max: worker.hourly_rate_max ?? null,
      rating_avg: worker.rating_avg ?? null,
      rating_count: worker.rating_count ?? null,
      jobs_completed: worker.jobs_completed ?? null,
      is_open_to_work: worker.is_open_to_work ?? null,
      is_public: worker.is_public ?? null,
      availability_notes: worker.availability_notes || null,
    };
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">Workers</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Find local workers
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Browse workers by category, nation, city, postcode prefix, and rate.
            Find people nearby who are open to work and ready to help.
          </p>
        </div>

        {error ? (
          <div className="rounded-[2rem] border border-red-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Could not load workers
            </h2>
            <p className="mt-2 text-sm text-red-600">
              {error.message || "Please try again."}
            </p>
          </div>
        ) : (
          <WorkersSearchClient initialWorkers={initialWorkers} />
        )}
      </section>
    </main>
  );
}