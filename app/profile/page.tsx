import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ModeSwitcher from "@/components/ModeSwitcher";
import ProfileModesForm from "./ProfileModesForm";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [
    { data: profile, error: profileError },
    { data: workerProfile },
    { data: hirerProfile },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        city,
        postcode,
        area_slug,
        bio,
        phone_number,
        whatsapp_number,
        worker_enabled,
        hirer_enabled,
        is_active,
        is_admin,
        role,
        show_phone_after_accept,
        show_whatsapp_after_accept,
        created_at,
        updated_at
      `)
      .eq("id", user.id)
      .maybeSingle(),

    supabase
      .from("worker_profiles")
      .select(`
        id,
        headline,
        category,
        description,
        is_open_to_work,
        hourly_rate,
        hourly_rate_min,
        hourly_rate_max,
        rating_avg,
        rating_count,
        jobs_completed,
        availability
      `)
      .eq("user_id", user.id)
      .maybeSingle(),

    supabase
      .from("hirer_profiles")
      .select(`
        id,
        company_name,
        contact_name,
        hirer_type,
        industry
      `)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (profileError || !profile) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-4xl">
          <div className="rounded-[2rem] border border-red-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
            <p className="mt-3 text-sm text-red-600">
              {profileError?.message || "Could not load your profile."}
            </p>
          </div>
        </section>
      </main>
    );
  }

  const isAdmin = profile.is_admin === true || profile.role === "admin";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">Account</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            My profile
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Manage your personal details, contact information, account modes,
            and profile settings from one place.
          </p>
        </div>

        {profile.worker_enabled && profile.hirer_enabled ? (
          <div className="mb-8">
            <ModeSwitcher
              currentMode="all"
              workerEnabled={profile.worker_enabled === true}
              hirerEnabled={profile.hirer_enabled === true}
            />
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.3fr,0.9fr]">
          <div className="space-y-6">
            <ProfileModesForm
              workerEnabled={profile.worker_enabled === true}
              hirerEnabled={profile.hirer_enabled === true}
            />

            <ProfileForm
              initialFullName={profile.full_name || ""}
              initialEmail={profile.email || ""}
              initialCity={profile.city || ""}
              initialPostcode={profile.postcode || ""}
              initialAreaSlug={profile.area_slug || "belfast"}
              initialWorkerEnabled={profile.worker_enabled === true}
              initialHirerEnabled={profile.hirer_enabled === true}
              initialAvailability={workerProfile?.availability || null}
              initialPhoneNumber={profile.phone_number || ""}
              initialWhatsappNumber={profile.whatsapp_number || ""}
              initialShowPhoneAfterAccept={profile.show_phone_after_accept === true}
              initialShowWhatsappAfterAccept={
                profile.show_whatsapp_after_accept === true
              }
              initialBio={profile.bio || ""}
            />

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-900">
                  {profile.full_name || "User"}
                </h2>

                {profile.worker_enabled ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Worker enabled
                  </span>
                ) : null}

                {profile.hirer_enabled ? (
                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                    Hirer enabled
                  </span>
                ) : null}

                {!profile.is_active ? (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-700">
                    Inactive
                  </span>
                ) : null}

                {isAdmin ? (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Admin
                  </span>
                ) : null}
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Email
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {profile.email || "Not set"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Mobile
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {profile.phone_number || "Not set"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    WhatsApp
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {profile.whatsapp_number || "Not set"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Location
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {profile.city || profile.area_slug || "Not set"}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-bold text-slate-900">About</h3>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {profile.bio || "No profile bio added yet."}
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/dashboard"
                  className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Back to dashboard
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-bold text-slate-900">
                Contact visibility
              </h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Show phone after accept
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {profile.show_phone_after_accept ? "Yes" : "No"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Show WhatsApp after accept
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {profile.show_whatsapp_after_accept ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Worker mode</h2>

              {workerProfile ? (
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <p>
                    <span className="font-semibold text-slate-900">
                      Headline:
                    </span>{" "}
                    {workerProfile.headline || "Not set"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">
                      Category:
                    </span>{" "}
                    {workerProfile.category || "Not set"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">
                      Open to work:
                    </span>{" "}
                    {workerProfile.is_open_to_work ? "Yes" : "No"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Rate:</span>{" "}
                    {workerProfile.hourly_rate
                      ? `GBP ${workerProfile.hourly_rate}`
                      : workerProfile.hourly_rate_min ||
                        workerProfile.hourly_rate_max
                      ? `GBP ${workerProfile.hourly_rate_min ?? 0}${
                          workerProfile.hourly_rate_max
                            ? ` - ${workerProfile.hourly_rate_max}`
                            : ""
                        }`
                      : "Not set"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">
                      Completed jobs:
                    </span>{" "}
                    {workerProfile.jobs_completed ?? 0}
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-600">
                  Worker mode is not fully set up yet.
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/jobs"
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                >
                  Browse jobs
                </Link>
                <Link
                  href="/my-applications"
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                >
                  My applications
                </Link>
                <Link
                  href="/requests"
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                >
                  Requests
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Hirer mode</h2>

              {hirerProfile ? (
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <p>
                    <span className="font-semibold text-slate-900">
                      Company:
                    </span>{" "}
                    {hirerProfile.company_name || "Not set"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">
                      Contact name:
                    </span>{" "}
                    {hirerProfile.contact_name || "Not set"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Type:</span>{" "}
                    {hirerProfile.hirer_type || "Not set"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">
                      Industry:
                    </span>{" "}
                    {hirerProfile.industry || "Not set"}
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-600">
                  Hirer mode is not fully set up yet.
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/workers"
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                >
                  Browse workers
                </Link>
                <Link
                  href="/post-job"
                  className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Post a job
                </Link>
                <Link
                  href="/my-job-posts"
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                >
                  My job posts
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}