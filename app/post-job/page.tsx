import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PostJobForm from "./PostJobForm";

export default async function PostJobPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      email,
      hirer_enabled,
      is_active,
      country,
      region,
      city,
      postcode_prefix,
      postcode_full
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_active) {
    redirect("/dashboard");
  }

  if (!profile.hirer_enabled) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-4xl">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Post a job</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Hirer mode is required
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              To post a job, first enable hirer mode in your profile settings.
            </p>

            <div className="mt-6">
              <a
                href="/profile"
                className="inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Go to profile settings
              </a>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">Create a job</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Post a local job
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Create a clear job post with category, title, description, area, and
            budget so nearby workers can find it more easily.
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <PostJobForm
            defaultCountry={profile.country || "United Kingdom"}
            defaultRegion={profile.region || ""}
            defaultCity={profile.city || ""}
            defaultPostcodePrefix={profile.postcode_prefix || ""}
            defaultPostcodeFull={profile.postcode_full || ""}
          />
        </div>
      </section>
    </main>
  );
}