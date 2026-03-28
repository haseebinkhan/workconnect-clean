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
        country,
        region,
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
      <main className="min-h-screen bg-slate-50 px-4 py-8">
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
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-6xl">

        {/* HEADER */}
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">Account</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            My profile
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Manage your personal details and account settings.
          </p>
        </div>

        {/* MODE SWITCHER */}
        {profile.worker_enabled && profile.hirer_enabled && (
          <div className="mb-8">
            <ModeSwitcher
              currentMode="all"
              workerEnabled={true}
              hirerEnabled={true}
            />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.3fr,0.9fr]">

          {/* LEFT SIDE */}
          <div className="space-y-6">

            <ProfileModesForm
              workerEnabled={profile.worker_enabled === true}
              hirerEnabled={profile.hirer_enabled === true}
            />

            {/* MAIN FORM */}
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
              initialShowWhatsappAfterAccept={profile.show_whatsapp_after_accept === true}
              initialBio={profile.bio || ""}

              // NEW UK FIELDS
              initialCountry={profile.country || "United Kingdom"}
              initialRegion={profile.region || "Northern Ireland"}
            />

          </div>

          {/* RIGHT SIDE */}
          <div className="space-y-6">

            {/* SUMMARY */}
            <div className="rounded-[2rem] border bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Profile summary</h2>

              <div className="mt-4 space-y-2 text-sm">
                <p><strong>Name:</strong> {profile.full_name}</p>
                <p><strong>Email:</strong> {profile.email}</p>
                <p><strong>Country:</strong> {profile.country || "UK"}</p>
                <p><strong>Region:</strong> {profile.region || "-"}</p>
                <p><strong>City:</strong> {profile.city || "-"}</p>
              </div>
            </div>

            {/* NAVIGATION */}
            <div className="rounded-[2rem] border bg-white p-6 shadow-sm">
              <Link
                href="/dashboard"
                className="block rounded-xl bg-indigo-600 px-4 py-3 text-center text-white"
              >
                Back to dashboard
              </Link>
            </div>

          </div>

        </div>
      </section>
    </main>
  );
}