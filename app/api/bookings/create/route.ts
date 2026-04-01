import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { buildAccess } from "@/lib/access";
import { enqueueEmail } from "@/lib/email/queue";
import { newRequestEmail } from "@/lib/email/events";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value: unknown) {
  const text = normalizeText(value);
  return text ? text : null;
}

function normalizeUpperText(value: unknown) {
  const text = normalizeText(value);
  return text ? text.toUpperCase() : "";
}

function safeIsoDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function isValidUKFullPostcode(value: string) {
  const text = value.trim().toUpperCase();
  if (!text) return true;
  return /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/.test(text);
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const workerUserId = normalizeText(body?.workerUserId);
    const workerProfileId = normalizeText(body?.workerProfileId);
    const title = normalizeText(body?.title);
    const message = normalizeText(body?.message);
    const areaSlug = normalizeText(body?.areaSlug) || "united-kingdom";

    const country = normalizeText(body?.country) || "United Kingdom";
    const region = normalizeOptionalText(body?.region);
    const city = normalizeOptionalText(body?.city);

    const postcodeRaw = normalizeUpperText(body?.postcode);
    const postcode = postcodeRaw || null;

    const postcodePrefixRaw = normalizeUpperText(body?.postcodePrefix);
    const postcodePrefix = postcodePrefixRaw || null;

    const postcodeFullRaw = normalizeUpperText(body?.postcodeFull);
    const postcodeFull = postcodeFullRaw || null;

    const preferredMeetingAtRaw = normalizeText(body?.preferredMeetingAt);
    const preferredMeetingAt = preferredMeetingAtRaw
      ? safeIsoDate(preferredMeetingAtRaw)
      : null;

    const budgetAmount =
      typeof body?.budgetAmount === "number" && !Number.isNaN(body.budgetAmount)
        ? body.budgetAmount
        : null;

    if (!workerUserId || !workerProfileId || !title || !message) {
      return NextResponse.json(
        { error: "Missing required booking fields." },
        { status: 400 }
      );
    }

    if (!preferredMeetingAt) {
      return NextResponse.json(
        { error: "Meeting time is required before sending the request." },
        { status: 400 }
      );
    }

    if (postcodeFull && !isValidUKFullPostcode(postcodeFull)) {
      return NextResponse.json(
        { error: "Full postcode is not valid." },
        { status: 400 }
      );
    }

    if (user.id === workerUserId) {
      return NextResponse.json(
        { error: "You cannot create a request with yourself." },
        { status: 400 }
      );
    }

    const { data: hirerProfile, error: hirerProfileError } = await adminSupabase
      .from("profiles")
      .select(
        "id, full_name, email, worker_enabled, hirer_enabled, is_active, country, region, city, postcode_prefix, postcode_full"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (hirerProfileError || !hirerProfile) {
      return NextResponse.json(
        { error: "Your profile was not found." },
        { status: 404 }
      );
    }

    if (!hirerProfile.is_active) {
      return NextResponse.json(
        { error: "Your account is not active." },
        { status: 403 }
      );
    }

    const hirerAccess = buildAccess(hirerProfile);

    if (!hirerAccess.canSendWorkerRequest) {
      return NextResponse.json(
        { error: "Switch to hirer mode to contact workers." },
        { status: 403 }
      );
    }

    const { data: workerUserProfile, error: workerUserProfileError } =
      await adminSupabase
        .from("profiles")
        .select(
          "id, full_name, email, worker_enabled, is_active, country, region, city, postcode_prefix, postcode_full"
        )
        .eq("id", workerUserId)
        .maybeSingle();

    if (workerUserProfileError || !workerUserProfile) {
      return NextResponse.json(
        { error: "Worker profile not found." },
        { status: 404 }
      );
    }

    if (!workerUserProfile.is_active || !workerUserProfile.worker_enabled) {
      return NextResponse.json(
        { error: "This worker is not currently available." },
        { status: 400 }
      );
    }

    const { data: workerProfile, error: workerProfileError } = await adminSupabase
      .from("worker_profiles")
      .select(
        "id, user_id, is_open_to_work, country, region, city, postcode, postcode_prefix, postcode_full, area_slug"
      )
      .eq("id", workerProfileId)
      .eq("user_id", workerUserId)
      .maybeSingle();

    if (workerProfileError || !workerProfile) {
      return NextResponse.json(
        { error: "Worker professional profile not found." },
        { status: 404 }
      );
    }

    if (!workerProfile.is_open_to_work) {
      return NextResponse.json(
        { error: "This worker is not currently open to work." },
        { status: 400 }
      );
    }

    const { data: existingBooking } = await adminSupabase
      .from("bookings")
      .select("id, status")
      .eq("hirer_user_id", user.id)
      .eq("worker_user_id", workerUserId)
      .eq("worker_profile_id", workerProfile.id)
      .in("status", ["pending", "accepted", "in_progress", "worker_marked_done"])
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingBooking?.id) {
      return NextResponse.json(
        {
          error: "An active request or booking with this worker already exists.",
          bookingId: existingBooking.id,
        },
        { status: 409 }
      );
    }

    const meetingText = new Date(preferredMeetingAt).toLocaleString("en-GB");
    const now = new Date().toISOString();

    const bookingCountry =
      country ||
      workerProfile.country ||
      workerUserProfile.country ||
      "United Kingdom";

    const bookingRegion =
      region ||
      workerProfile.region ||
      workerUserProfile.region ||
      hirerProfile.region ||
      null;

    const bookingCity =
      city ||
      workerProfile.city ||
      workerUserProfile.city ||
      hirerProfile.city ||
      null;

    const bookingPostcodeFull =
      postcodeFull ||
      postcode ||
      workerProfile.postcode_full ||
      workerProfile.postcode ||
      workerUserProfile.postcode_full ||
      hirerProfile.postcode_full ||
      null;

    const bookingPostcodePrefix =
      postcodePrefix ||
      workerProfile.postcode_prefix ||
      workerUserProfile.postcode_prefix ||
      hirerProfile.postcode_prefix ||
      null;

    const bookingAreaSlug =
      areaSlug ||
      workerProfile.area_slug ||
      "united-kingdom";

    const insertPayload: Record<string, unknown> = {
      hirer_user_id: user.id,
      worker_user_id: workerUserId,
      worker_profile_id: workerProfile.id,
      title,
      message,
      budget_amount: budgetAmount,
      currency_code: "GBP",
      area_slug: bookingAreaSlug,
      country: bookingCountry,
      region: bookingRegion,
      city: bookingCity,
      postcode: bookingPostcodeFull,
      status: "pending",
      seen_by_hirer: true,
      seen_by_worker: false,
      preferred_meeting_at: preferredMeetingAt,
    };

    const { data: booking, error: bookingError } = await adminSupabase
      .from("bookings")
      .insert(insertPayload)
      .select("id, title, status")
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: bookingError?.message || "Could not create request." },
        { status: 400 }
      );
    }

    const initialMessage = `${message}\n\nPreferred meeting time: ${meetingText}`;

    const { error: messageError } = await adminSupabase.from("messages").insert({
      booking_id: booking.id,
      sender_id: user.id,
      receiver_id: workerUserId,
      content: initialMessage,
      is_read: false,
      delivered: false,
    });

    if (messageError) {
      console.error("create booking initial message error:", messageError);
    }

    await adminSupabase.from("notifications").insert([
      {
        user_id: workerUserId,
        type: "worker_request_received",
        title: "New work request",
        body: `You received a new request: "${title}".`,
        meta: {
          booking_id: booking.id,
          hirer_user_id: user.id,
          preferred_meeting_at: preferredMeetingAt,
          country: bookingCountry,
          region: bookingRegion,
          city: bookingCity,
          postcode_prefix: bookingPostcodePrefix,
          postcode_full: bookingPostcodeFull,
          area_slug: bookingAreaSlug,
          created_at: now,
        },
      },
      {
        user_id: user.id,
        type: "worker_request_sent",
        title: "Request sent",
        body: `Your request to ${workerUserProfile.full_name || "this worker"} was sent.`,
        meta: {
          booking_id: booking.id,
          worker_user_id: workerUserId,
          preferred_meeting_at: preferredMeetingAt,
          country: bookingCountry,
          region: bookingRegion,
          city: bookingCity,
          postcode_prefix: bookingPostcodePrefix,
          postcode_full: bookingPostcodeFull,
          area_slug: bookingAreaSlug,
          created_at: now,
        },
      },
    ]);

    if (workerUserProfile.email) {
      await enqueueEmail([
        {
          kind: "new_request_received",
          userId: workerUserProfile.id,
          toEmail: workerUserProfile.email,
          subject: "New work request received",
          html: queuenewRequestEmail({
            workerName: workerUserProfile.full_name || "Worker",
            hirerName: hirerProfile.full_name || "Hirer",
            requestTitle: title,
            message,
            meetingTime: meetingText,
          }),
          meta: {
            booking_id: booking.id,
            worker_user_id: workerUserId,
            hirer_user_id: user.id,
            preferred_meeting_at: preferredMeetingAt,
            meeting_text: meetingText,
            title,
          },
        },
      ]);
    }

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      status: booking.status,
      message: "Request sent successfully.",
    });
  } catch (error) {
    console.error("bookings/create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}