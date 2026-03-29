import { createClient } from "@/lib/supabase/server";
import { autoCloseExpiredJobs } from "@/lib/jobs/autoCloseExpiredJobs";
import JobsSearchClient from "./JobsSearchClient";

export type JobSearchItem = {
  id: string;
  title: string;
  description: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  areaSlug: string | null;
  postcodePrefix: string | null;
  postcodeFull: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  currencyCode: string | null;
  locationType: string | null;
  status: string;
  visibility: string | null;
  createdAt: string | null;
  expiresAt: string | null;
};

export default async function JobsPage() {
  await autoCloseExpiredJobs();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let defaultRegion = "";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("region")
      .eq("id", user.id)
      .maybeSingle();

    defaultRegion = profile?.region || "";
  }

  const { data: jobs } = await supabase
    .from("jobs")
    .select(`
      id,
      title,
      description,
      country,
      region,
      city,
      area_slug,
      postcode_prefix,
      postcode_full,
      budget_min,
      budget_max,
      currency_code,
      location_type,
      status,
      visibility,
      created_at,
      expires_at,
      deleted_at
    `)
    .eq("status", "open")
    .eq("visibility", "public")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const items: JobSearchItem[] = (jobs || []).map((job) => ({
    id: job.id,
    title: job.title,
    description: job.description || null,
    country: job.country || "United Kingdom",
    region: job.region || null,
    city: job.city || null,
    areaSlug: job.area_slug || null,
    postcodePrefix: job.postcode_prefix || null,
    postcodeFull: job.postcode_full || null,
    budgetMin: job.budget_min ?? null,
    budgetMax: job.budget_max ?? null,
    currencyCode: job.currency_code || "GBP",
    locationType: job.location_type || null,
    status: job.status || "open",
    visibility: job.visibility || null,
    createdAt: job.created_at || null,
    expiresAt: job.expires_at || null,
  }));

  return <JobsSearchClient jobs={items} defaultRegion={defaultRegion} />;
}