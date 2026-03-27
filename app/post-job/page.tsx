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
    .select("id, full_name, worker_enabled, hirer_enabled, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    redirect("/profile");
  }

  if (!profile.is_active) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-4xl">
          <div className="rounded-[2rem] border border-red-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">Post a job</h1>
            <p className="mt-3 text-sm text-red-600">
              Your account is not active. You cannot post jobs right now.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const access = buildAccess(profile);

  if (!access.canPostJobs) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-4xl">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">Post a job</h1>
            <p className="mt-3 text-sm text-slate-600">
              You need hirer access before you can post jobs.
            </p>
            <div className="mt-6">
              <a
                href="/profile"
                className="inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
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
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-4xl">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">Post a job</h1>
            <p className="mt-3 text-sm text-slate-600">
              Please complete your hirer profile before posting a job.
            </p>
            <div className="mt-6">
              <a
                href="/profile"
                className="inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
              >
                Complete hirer profile
              </a>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const { data: areas } = await supabase
    .from("areas")
    .select("id, name, slug, region")
    .eq("is_active", true)
    .order("name", { ascending: true });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">Hiring</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Post a job
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Create a stronger job brief with pricing, contract style, location and work
            requirements. Your post will be submitted to admin for review before going live.
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <PostJobForm areas={areas ?? []} />
        </div>
      </section>
    </main>
  );
}