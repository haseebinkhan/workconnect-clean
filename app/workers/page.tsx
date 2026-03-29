import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildAccess } from "@/lib/access";
import WorkersSearchClient from "./WorkersSearchClient";

export type WorkerSearchItem = {
  id: string;
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  headline: string | null;
  description: string | null;
  category: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  areaSlug: string | null;
  postcodePrefix: string | null;
  postcodeFull: string | null;
  hourlyRate: number | null;
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  ratingAvg: number | null;
  ratingCount: number | null;
  jobsCompleted: number | null;
  isFeatured: boolean;
  isOpenToWork: boolean;
  availability: Record<string, string[]>;
  availabilityNotes: string | null;
  certifications: string[];
};

export default async function WorkersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, worker_enabled, hirer_enabled, is_active, country, region")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    redirect("/profile");
  }

  if (!profile.is_active) {
    redirect("/dashboard");
  }

  const access = buildAccess(profile);

  if (!access.canBrowseWorkers) {
    redirect("/dashboard");
  }

  const { data: workerProfiles, error: workerProfilesError } = await supabase
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
      postcode_prefix,
      postcode_full,
      hourly_rate,
      hourly_rate_min,
      hourly_rate_max,
      rating_avg,
      rating_count,
      jobs_completed,
      is_featured,
      is_open_to_work,
      is_public,
      availability,
      availability_notes,
      certifications
    `)
    .eq("is_open_to_work", true)
    .eq("is_public", true)
    .order("is_featured", { ascending: false })
    .order("updated_at", { ascending: false });

  if (workerProfilesError) {
    redirect("/dashboard");
  }

  const workerUserIds = [...new Set((workerProfiles || []).map((w) => w.user_id))];

  const { data: profiles } = workerUserIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, country, region, city, postcode_prefix, postcode_full")
        .in("id", workerUserIds)
    : { data: [] };

  const profileMap = new Map((profiles || []).map((item) => [item.id, item]));

  const workers: WorkerSearchItem[] = (workerProfiles || []).map((worker) => {
    const person = profileMap.get(worker.user_id);

    return {
      id: worker.id,
      userId: worker.user_id,
      fullName: person?.full_name || "Worker",
      avatarUrl: person?.avatar_url || null,
      headline: worker.headline || null,
      description: worker.description || null,
      category: worker.category || null,
      country: worker.country || person?.country || "United Kingdom",
      region: worker.region || person?.region || null,
      city: worker.city || person?.city || null,
      areaSlug: worker.area_slug || null,
      postcodePrefix: worker.postcode_prefix || person?.postcode_prefix || null,
      postcodeFull: worker.postcode_full || person?.postcode_full || null,
      hourlyRate: worker.hourly_rate ?? null,
      hourlyRateMin: worker.hourly_rate_min ?? null,
      hourlyRateMax: worker.hourly_rate_max ?? null,
      ratingAvg: worker.rating_avg ?? null,
      ratingCount: worker.rating_count ?? null,
      jobsCompleted: worker.jobs_completed ?? null,
      isFeatured: !!worker.is_featured,
      isOpenToWork: !!worker.is_open_to_work,
      availability:
        worker.availability && typeof worker.availability === "object"
          ? (worker.availability as Record<string, string[]>)
          : {},
      availabilityNotes: worker.availability_notes || null,
      certifications: Array.isArray(worker.certifications)
        ? worker.certifications
        : [],
    };
  });

  return (
    <WorkersSearchClient
      workers={workers}
      defaultRegion={profile.region || ""}
    />
  );
}