import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildAccess } from "@/lib/access";
import PostJobForm from "./PostJobForm";

export default async function PostJobPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      worker_enabled,
      hirer_enabled,
      is_active,
      country,
      region,
      city
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    redirect("/profile");
  }

  if (!profile.is_active) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8">
        <section className="mx-auto max-w-4xl">
          <div className="rounded-[2rem] border border-red-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">Post a job</h1>
            <p className="mt-3 text-sm text-red-600">
              Your account is not active.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const access = buildAccess(profile);

  if (!access.canPostJobs) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8">
        <section className="mx-auto max-w-4xl">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">Post a job</h1>
            <p className="mt-3 text-sm text-slate-600">
              You need hirer mode enabled.
            </p>
            <div className="mt-6">
              <a
                href="/profile"
                className="rounded-2xl bg-slate-900 px-5 py-3 text-white"
              >
                Update profile
              </a>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const { data: hirerProfile } = await supabase
    .from("hirer_profiles")
    .select("id, company_name, contact_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!hirerProfile?.id) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8">
        <section className="mx-auto max-w-4xl">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">Post a job</h1>
            <p className="mt-3 text-sm text-slate-600">
              Complete hirer profile first.
            </p>
            <div className="mt-6">
              <a
                href="/profile"
                className="rounded-2xl bg-slate-900 px-5 py-3 text-white"
              >
                Complete profile
              </a>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // OLD system (keep for compatibility)
  const { data: areas } = await supabase
    .from("areas")
    .select("id, name, slug, region")
    .eq("is_active", true)
    .order("name", { ascending: true });

  // NEW UK system
  const UK_REGIONS = [
    "England",
    "Northern Ireland",
    "Scotland",
    "Wales",
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="text-sm text-slate-500">Hiring</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Post a job
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Create a job with location, pricing, and requirements.
          </p>
        </div>

        <div className="rounded-[2rem] border bg-white p-6 shadow-sm">
          <PostJobForm
            areas={areas ?? []} // backward compatible
            regions={UK_REGIONS} // NEW
            defaultCountry={profile.country || "United Kingdom"}
            defaultRegion={profile.region || "Northern Ireland"}
            defaultCity={profile.city || ""}
          />
        </div>
      </section>
    </main>
  );
}

