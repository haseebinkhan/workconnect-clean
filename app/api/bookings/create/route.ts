import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { buildAccess } from "@/lib/access";
import { sendEmail } from "@/lib/email/send";
import { newRequestEmail } from "@/lib/email/templates";

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

export async function POST(req: Request) {
  try {
    const supabase = createServerClient();

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
    const postcode = normalizeUpperText(body?.postcode) || null;

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

    if (user.id === workerUserId) {
      return NextResponse.json(
        { error: "You cannot create a request with yourself." },
        { status: 400 }
      );
    }

    const { data: hirerProfile, error: hirerProfileError } = await adminSupabase
      .from("profiles")
      .select("id, full_name, email, worker_enabled, hirer_enabled, is_active")
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
        .select("id, full_name, email, worker_enabled, is_active")
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
      .select("id, user_id, is_open_to_work, country, city, postcode, area_slug")
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

    const bookingCountry = country || workerProfile.country || "United Kingdom";
    const bookingCity = city || workerProfile.city || null;
    const bookingPostcode = postcode || workerProfile.postcode || null;
    const bookingAreaSlug =
      areaSlug || workerProfile.area_slug || "united-kingdom";

    const { data: booking, error: bookingError } = await adminSupabase
      .from("bookings")
      .insert({
        hirer_user_id: user.id,
        worker_user_id: workerUserId,
        worker_profile_id: workerProfile.id,
        title,
        message,
        budget_amount: budgetAmount,
        currency_code: "GBP",
        area_slug: bookingAreaSlug,
        country: bookingCountry,
        region,
        city: bookingCity,
        postcode: bookingPostcode,
        status: "pending",
        seen_by_hirer: true,
        seen_by_worker: false,
        preferred_meeting_at: preferredMeetingAt,
      })
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
          region,
          city: bookingCity,
          postcode: bookingPostcode,
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
          region,
          city: bookingCity,
          postcode: bookingPostcode,
          area_slug: bookingAreaSlug,
          created_at: now,
        },
      },
    ]);

    if (workerUserProfile.email) {
      await sendEmail({
        to: workerUserProfile.email,
        subject: "New work request received",
        html: newRequestEmail({
          workerName: workerUserProfile.full_name || "Worker",
          hirerName: hirerProfile.full_name || "Hirer",
          requestTitle: title,
          message,
          meetingTime: meetingText,
        }),
      });
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
