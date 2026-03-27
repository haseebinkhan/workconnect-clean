import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DirectContactCard from "@/components/DirectContactCard";
import WorkerReviewsList from "@/components/reviews/WorkerReviewsList";
import RequestWorkerCard from "./request-worker-card";
import SaveWorkerButton from "@/components/workers/SaveWorkerButton";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    slot?: string;
  }>;
};

function formatRate(
  hourlyRate: number | null,
  hourlyRateMin: number | null,
  hourlyRateMax: number | null
) {
  if (hourlyRate != null) return `GBP ${hourlyRate}/hr`;
  if (hourlyRateMin != null || hourlyRateMax != null) {
    return `GBP ${hourlyRateMin ?? 0}${
      hourlyRateMax != null ? ` - ${hourlyRateMax}` : ""
    }/hr`;
  }
  return "Not specified";
}

function titleCase(value?: string | null) {
  if (!value) return "Not specified";
  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getNextDateForWeekday(targetWeekday: number) {
  const now = new Date();
  const result = new Date(now);
  const currentWeekday = result.getDay();
  let delta = targetWeekday - currentWeekday;
  if (delta < 0) delta += 7;
  if (delta === 0) delta = 7;
  result.setDate(result.getDate() + delta);
  return result;
}

function buildSlotDateTime(day: string, shift: string) {
  const dayMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const hourMap: Record<string, number> = {
    morning: 9,
    afternoon: 14,
    evening: 18,
  };

  const date = getNextDateForWeekday(dayMap[day] ?? 1);
  date.setHours(hourMap[shift] ?? 9, 0, 0, 0);

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function slotLabel(day: string, shift: string) {
  return `${titleCase(day)} • ${titleCase(shift)}`;
}

export default async function WorkerProfilePage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) || {};
  const selectedSlot = resolvedSearchParams.slot || null;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: workerProfile, error: workerError } = await supabase
    .from("worker_profiles")
    .select(`
      id,
      user_id,
      headline,
      description,
      category,
      city,
      area_slug,
      hourly_rate,
      hourly_rate_min,
      hourly_rate_max,
      availability_notes,
      rating_avg,
      rating_count,
      jobs_completed,
      is_open_to_work,
      experience_years,
      certifications,
      availability
    `)
    .eq("id", id)
    .maybeSingle();

  if (workerError || !workerProfile) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      avatar_url,
      bio,
      city,
      area_slug,
      phone_number,
      whatsapp_number,
      show_phone_after_accept,
      show_whatsapp_after_accept
    `)
    .eq("id", workerProfile.user_id)
    .maybeSingle();

  const { data: reviewRows } = await supabase
    .from("reviews")
    .select(`
      id,
      rating,
      comment,
      created_at,
      reviewer_id
    `)
    .eq("reviewee_id", workerProfile.user_id)
    .order("created_at", { ascending: false })
    .limit(10);

  const reviewerIds = [...new Set((reviewRows || []).map((item) => item.reviewer_id))];

  const { data: reviewers } = reviewerIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", reviewerIds)
    : { data: [] };

  const reviewerMap = new Map((reviewers || []).map((item) => [item.id, item.full_name]));

  const reviews = (reviewRows || []).map((item) => ({
    id: item.id,
    rating: item.rating,
    comment: item.comment,
    created_at: item.created_at,
    reviewer_name: reviewerMap.get(item.reviewer_id) || "Hirer",
  }));

  let acceptedBookingId: string | null = null;
  let hasAcceptedConnection = false;
  const isOwner = !!user && user.id === workerProfile.user_id;

  if (user && !isOwner) {
    const { data: acceptedBooking } = await supabase
      .from("bookings")
      .select("id, status")
      .or(
        `and(hirer_user_id.eq.${user.id},worker_user_id.eq.${workerProfile.user_id}),and(worker_user_id.eq.${user.id},hirer_user_id.eq.${workerProfile.user_id})`
      )
      .eq("status", "accepted")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    acceptedBookingId = acceptedBooking?.id || null;
    hasAcceptedConnection = !!acceptedBooking?.id;
  }

  const availability =
    workerProfile.availability && typeof workerProfile.availability === "object"
      ? workerProfile.availability
      : {};

  const availabilityDays = Object.keys(availability).filter(
    (day) => Array.isArray(availability[day]) && availability[day].length > 0
  );

  const quickSlots = availabilityDays.flatMap((day) =>
    availability[day].map((shift: string) => ({
      label: slotLabel(day, shift),
      value: buildSlotDateTime(day, shift),
    }))
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[1.55fr,0.95fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-2xl font-bold text-indigo-700">
                    {profile?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.avatar_url}
                        alt={profile?.full_name || "Worker"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (profile?.full_name || "W")
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part: string) => part[0]?.toUpperCase() || "")
                        .join("")
                    )}
                  </div>

                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                      {profile?.full_name || "Worker"}
                    </h1>

                    <p className="mt-2 text-base text-slate-600">
                      {workerProfile.headline ||
                        workerProfile.category ||
                        "Worker profile"}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                          workerProfile.is_open_to_work
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {workerProfile.is_open_to_work
                          ? "Open to work"
                          : "Currently unavailable"}
                      </span>

                      {workerProfile.category ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                          {workerProfile.category}
                        </span>
                      ) : null}

                      {workerProfile.area_slug ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                          {titleCase(workerProfile.area_slug)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="grid w-full gap-3 sm:w-auto">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Rate
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatRate(
                        workerProfile.hourly_rate,
                        workerProfile.hourly_rate_min,
                        workerProfile.hourly_rate_max
                      )}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Rating
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {workerProfile.rating_avg != null
                        ? `${Number(workerProfile.rating_avg).toFixed(1)} (${workerProfile.rating_count ?? 0})`
                        : "No rating yet"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Category
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {workerProfile.category || "Not specified"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    City
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {profile?.city || workerProfile.city || "Not specified"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Experience
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {workerProfile.experience_years != null
                      ? `${workerProfile.experience_years} year(s)`
                      : "Not specified"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Jobs completed
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {workerProfile.jobs_completed ?? 0}
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-[1.5rem] bg-slate-50 p-5 sm:p-6">
                <h2 className="text-xl font-bold text-slate-900">About</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {workerProfile.description ||
                    profile?.bio ||
                    "No description provided yet."}
                </p>
              </div>

              <div className="mt-8 rounded-[1.5rem] bg-slate-50 p-5 sm:p-6">
                <h2 className="text-xl font-bold text-slate-900">Availability</h2>

                {availabilityDays.length > 0 ? (
                  <>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {availabilityDays.map((day) => (
                        <div
                          key={day}
                          className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
                        >
                          <p className="text-sm font-semibold text-slate-900">
                            {titleCase(day)}
                          </p>
                          <p className="mt-2 text-sm text-slate-600">
                            {availability[day].join(", ")}
                          </p>
                        </div>
                      ))}
                    </div>

                    {workerProfile.availability_notes ? (
                      <p className="mt-4 text-sm leading-7 text-slate-600">
                        {workerProfile.availability_notes}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    {workerProfile.availability_notes || "Availability not specified yet."}
                  </p>
                )}
              </div>

              {Array.isArray(workerProfile.certifications) &&
              workerProfile.certifications.length > 0 ? (
                <div className="mt-8 rounded-[1.5rem] bg-slate-50 p-5 sm:p-6">
                  <h2 className="text-xl font-bold text-slate-900">Certifications</h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {workerProfile.certifications.map((item: string) => (
                      <span
                        key={item}
                        className="rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <WorkerReviewsList reviews={reviews} />
          </div>

          <div className="space-y-6">
            <DirectContactCard
              workerName={profile?.full_name || "Worker"}
              phoneNumber={profile?.phone_number}
              whatsappNumber={profile?.whatsapp_number}
              showPhonePublicly={!profile?.show_phone_after_accept}
              showWhatsappPublicly={!profile?.show_whatsapp_after_accept}
              hasAcceptedConnection={hasAcceptedConnection}
              isOwner={isOwner}
              bookingId={acceptedBookingId}
            />

            {!isOwner ? (
              <>
                {quickSlots.length > 0 ? (
                  <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-900">
                      Instant hire slots
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      Choose one of the worker’s availability slots to prefill your meeting time.
                    </p>

                    <div className="mt-5 grid gap-3">
                      {quickSlots.slice(0, 8).map((slot) => (
                        <a
                          key={slot.value}
                          href={`/workers/${workerProfile.id}?slot=${encodeURIComponent(slot.value)}`}
                          className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                            selectedSlot === slot.value
                              ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {slot.label}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}

                <RequestWorkerCard
                  workerId={workerProfile.id}
                  workerUserId={workerProfile.user_id}
                  workerName={profile?.full_name || "Worker"}
                  areaSlug={workerProfile.area_slug || profile?.area_slug || "belfast"}
                  selectedMeetingAt={selectedSlot}
                />
              </>
            ) : null}

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900">Quick summary</h3>

              <div className="mt-5 space-y-3 text-sm text-slate-700">
                <p>
                  <span className="font-semibold text-slate-900">Name:</span>{" "}
                  {profile?.full_name || "Worker"}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Category:</span>{" "}
                  {workerProfile.category || "Not specified"}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">City:</span>{" "}
                  {profile?.city || workerProfile.city || "Not specified"}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Area:</span>{" "}
                  {titleCase(profile?.area_slug || workerProfile.area_slug)}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Open to work:</span>{" "}
                  {workerProfile.is_open_to_work ? "Yes" : "No"}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Rate:</span>{" "}
                  {formatRate(
                    workerProfile.hourly_rate,
                    workerProfile.hourly_rate_min,
                    workerProfile.hourly_rate_max
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}