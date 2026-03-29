import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [{ data: profile }, { data: workerProfile }, { data: hirerProfile }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(`
          id,
          email,
          full_name,
          role,
          worker_enabled,
          hirer_enabled,
          is_active,
          avatar_url,
          bio,
          phone_number,
          whatsapp_number,
          show_phone_after_accept,
          show_whatsapp_after_accept,
          country,
          region,
          city,
          area_slug,
          postcode_prefix,
          postcode_full
        `)
        .eq("id", user.id)
        .maybeSingle(),

      supabase
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
          is_open_to_work,
          is_public,
          availability,
          availability_notes,
          certifications,
          experience_years
        `)
        .eq("user_id", user.id)
        .maybeSingle(),

      supabase
        .from("hirer_profiles")
        .select(`
          id,
          user_id,
          company_name,
          contact_name,
          location,
          industry
        `)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  const initialProfile = {
    id: profile?.id ?? user.id,
    email: profile?.email ?? user.email ?? "",
    fullName: profile?.full_name ?? "",
    role: profile?.role ?? null,
    workerEnabled: profile?.worker_enabled ?? false,
    hirerEnabled: profile?.hirer_enabled ?? false,
    isActive: profile?.is_active ?? true,
    avatarUrl: profile?.avatar_url ?? "",
    bio: profile?.bio ?? "",
    phoneNumber: profile?.phone_number ?? "",
    whatsappNumber: profile?.whatsapp_number ?? "",
    showPhoneAfterAccept: profile?.show_phone_after_accept ?? true,
    showWhatsappAfterAccept: profile?.show_whatsapp_after_accept ?? true,

    country:
      workerProfile?.country ||
      profile?.country ||
      "United Kingdom",

    region:
      workerProfile?.region ||
      profile?.region ||
      "",

    city:
      workerProfile?.city ||
      profile?.city ||
      "",

    areaSlug:
      workerProfile?.area_slug ||
      profile?.area_slug ||
      "",

    postcodePrefix:
      workerProfile?.postcode_prefix ||
      profile?.postcode_prefix ||
      "",

    postcodeFull:
      workerProfile?.postcode_full ||
      profile?.postcode_full ||
      "",

    workerProfile: {
      id: workerProfile?.id ?? null,
      headline: workerProfile?.headline ?? "",
      description: workerProfile?.description ?? "",
      category: workerProfile?.category ?? "",
      hourlyRate:
        workerProfile?.hourly_rate != null
          ? String(workerProfile.hourly_rate)
          : "",
      hourlyRateMin:
        workerProfile?.hourly_rate_min != null
          ? String(workerProfile.hourly_rate_min)
          : "",
      hourlyRateMax:
        workerProfile?.hourly_rate_max != null
          ? String(workerProfile.hourly_rate_max)
          : "",
      isOpenToWork: workerProfile?.is_open_to_work ?? true,
      isPublic: workerProfile?.is_public ?? true,
      availability:
        workerProfile?.availability &&
        typeof workerProfile.availability === "object" &&
        !Array.isArray(workerProfile.availability)
          ? workerProfile.availability
          : {},
      availabilityNotes: workerProfile?.availability_notes ?? "",
      certifications: Array.isArray(workerProfile?.certifications)
        ? workerProfile!.certifications
        : [],
      experienceYears:
        workerProfile?.experience_years != null
          ? String(workerProfile.experience_years)
          : "",
      postcode:
        workerProfile?.postcode ?? "",
    },

    hirerProfile: {
      id: hirerProfile?.id ?? null,
      companyName: hirerProfile?.company_name ?? "",
      contactName: hirerProfile?.contact_name ?? "",
      location: hirerProfile?.location ?? "",
      industry: hirerProfile?.industry ?? "",
    },
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">Account</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Profile settings
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Manage your personal details, contact preferences, working modes,
            and location. Your region, city, and postcode prefix help the
            platform show better local matches.
          </p>
        </div>

        <ProfileForm initialProfile={initialProfile} />
      </section>
    </main>
  );
}