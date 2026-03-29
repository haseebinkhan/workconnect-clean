import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BecomeWorkerForm from "./BecomeWorkerForm";

export default async function BecomeWorkerPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [{ data: profile }, { data: workerProfile }] = await Promise.all([
    supabase
      .from("profiles")
      .select(`
        id,
        email,
        full_name,
        bio,
        phone_number,
        whatsapp_number,
        country,
        region,
        city,
        area_slug,
        postcode_prefix,
        postcode_full,
        worker_enabled,
        hirer_enabled,
        is_active
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
  ]);

  if (!profile) {
    redirect("/profile");
  }

  const initialData = {
    userId: user.id,
    fullName: profile.full_name || "",
    email: profile.email || user.email || "",
    bio: profile.bio || "",
    phoneNumber: profile.phone_number || "",
    whatsappNumber: profile.whatsapp_number || "",

    country:
      workerProfile?.country ||
      profile.country ||
      "United Kingdom",

    region:
      workerProfile?.region ||
      profile.region ||
      "",

    city:
      workerProfile?.city ||
      profile.city ||
      "",

    areaSlug:
      workerProfile?.area_slug ||
      profile.area_slug ||
      "",

    postcodePrefix:
      workerProfile?.postcode_prefix ||
      profile.postcode_prefix ||
      "",

    postcodeFull:
      workerProfile?.postcode_full ||
      workerProfile?.postcode ||
      profile.postcode_full ||
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
        ? workerProfile.certifications
        : [],
      experienceYears:
        workerProfile?.experience_years != null
          ? String(workerProfile.experience_years)
          : "",
    },
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">Worker setup</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Become a worker
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Set up your public worker profile, choose your service area, add
            pricing, and mark when you are available. Your saved signup region
            is already used as the starting point.
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <BecomeWorkerForm initialData={initialData} />
        </div>
      </section>
    </main>
  );
}