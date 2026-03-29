import { createClient } from "@/lib/supabase/server";
import JobsSearchClient from "./JobsSearchClient";

export default async function JobsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let workerDefaults = {
    category: "",
    region: "",
    city: "",
    postcodePrefix: "",
  };

  if (user) {
    const { data: workerProfile } = await supabase
      .from("worker_profiles")
      .select("category, region, city, postcode_prefix")
      .eq("user_id", user.id)
      .maybeSingle();

    if (workerProfile) {
      workerDefaults = {
        category: workerProfile.category || "",
        region: workerProfile.region || "",
        city: workerProfile.city || "",
        postcodePrefix: workerProfile.postcode_prefix || "",
      };
    }
  }

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select(`
      id,
      hirer_id,
      category,
      title,
      title_slug,
      description,
      country,
      region,
      city,
      postcode,
      postcode_prefix,
      postcode_full,
      area_slug,
      budget_min,
      budget_max,
      currency_code,
      location_type,
      status,
      visibility,
      expires_at,
      created_at,
      updated_at,
      deleted_at
    `)
    .eq("visibility", "public")
    .eq("status", "open")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const safeJobs = (jobs || []).filter((job) => {
    if (!job.expires_at) return true;
    const expiresAt = new Date(job.expires_at);
    if (Number.isNaN(expiresAt.getTime())) return true;
    return expiresAt.getTime() > Date.now();
  });

  const hirerIds = [...new Set(safeJobs.map((job) => job.hirer_id).filter(Boolean))];

  const { data: hirers } = hirerIds.length
    ? await supabase
        .from("hirer_profiles")
        .select("id, user_id, company_name, contact_name, industry")
        .in("id", hirerIds)
    : { data: [] as Array<any> };

  const hirerMap = new Map((hirers || []).map((item) => [item.id, item]));

  const initialJobs = safeJobs.map((job) => {
    const hirer = hirerMap.get(job.hirer_id);

    return {
      id: job.id,
      hirer_id: job.hirer_id,
      category: job.category || null,
      title: job.title || null,
      title_slug: job.title_slug || null,
      description: job.description || null,
      country: job.country || "United Kingdom",
      region: job.region || null,
      city: job.city || null,
      postcode: job.postcode || null,
      postcode_prefix: job.postcode_prefix || null,
      postcode_full: job.postcode_full || null,
      area_slug: job.area_slug || null,
      budget_min: job.budget_min ?? null,
      budget_max: job.budget_max ?? null,
      currency_code: job.currency_code || "GBP",
      location_type: job.location_type || "local",
      status: job.status || null,
      visibility: job.visibility || null,
      expires_at: job.expires_at || null,
      created_at: job.created_at || null,
      updated_at: job.updated_at || null,
      hirer_company_name: hirer?.company_name || null,
      hirer_contact_name: hirer?.contact_name || null,
      hirer_industry: hirer?.industry || null,
    };
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">Jobs</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Find jobs near you
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Browse jobs by category, nation, city, postcode prefix, budget, and
            work type. Matching jobs can be highlighted using your worker profile.
          </p>
        </div>

        {error ? (
          <div className="rounded-[2rem] border border-red-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Could not load jobs
            </h2>
            <p className="mt-2 text-sm text-red-600">
              {error.message || "Please try again."}
            </p>
          </div>
        ) : (
          <JobsSearchClient
            initialJobs={initialJobs}
            workerDefaults={workerDefaults}
          />
        )}
      </section>
    </main>
  );
}