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

function buildLocationText({
  country,
  region,
  city,
  postcode,
  areaSlug,
}: {
  country?: string | null;
  region?: string | null;
  city?: string | null;
  postcode?: string | null;
  areaSlug?: string | null;
}) {
  const parts = [city, region, country].filter(Boolean);
  return parts.join(", ") || postcode || areaSlug || "Location not specified";
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

    if (!workerUserId || !workerProfileId || !title || !message) {
      return NextResponse.json(
        { error: "Missing required booking fields." },
        { status: 400 }
      );
    }

    if (user.id === workerUserId) {
      return NextResponse.json(
        { error: "You cannot create a request with yourself." },
        { status: 400 }
      );
    }

    const { data: workerUserProfile } = await adminSupabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", workerUserId)
      .single();

    const { data: workerProfile } = await adminSupabase
      .from("worker_profiles")
      .select("id")
      .eq("id", workerProfileId)
      .single();

    const now = new Date().toISOString();

    // ✅ CREATE BOOKING
    const { data: booking, error: bookingError } = await adminSupabase
      .from("bookings")
      .insert({
        hirer_user_id: user.id,
        worker_user_id: workerUserId,
        worker_profile_id: workerProfile.id,
        title,
        message,
        status: "pending",
        seen_by_hirer: true,
        seen_by_worker: false,
      })
      .select("id, title, status")
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: bookingError?.message || "Could not create request." },
        { status: 400 }
      );
    }

    // ✅ IMPORTANT FIX — MESSAGE INSERT
    const { error: messageError } = await adminSupabase.from("messages").insert({
      booking_id: booking.id,
      sender_id: user.id,
      receiver_id: workerUserId,
      content: message,
      is_read: false,
      delivered: true, // 🔥 FIXED
      message_type: "text",
      created_at: now,
    });

    if (messageError) {
      console.error("message insert error:", messageError);
    }

    // ✅ CREATE NOTIFICATIONS
    await adminSupabase.from("notifications").insert([
      {
        user_id: workerUserId,
        type: "new_message",
        title: `New request: ${title}`,
        body: message,
        meta: {
          booking_id: booking.id,
          sender_id: user.id,
          created_at: now,
        },
      },
      {
        user_id: user.id,
        type: "request_sent",
        title: "Request sent",
        body: `Your request to ${
          workerUserProfile?.full_name || "worker"
        } was sent.`,
        meta: {
          booking_id: booking.id,
          created_at: now,
        },
      },
    ]);

    // ✅ EMAIL (kept your functionality)
    if (workerUserProfile?.email) {
      await enqueueEmail({
        userId: workerUserProfile.id,
        toEmail: workerUserProfile.email,
        subject: "New work request",
        html: newRequestEmail({
          workerName: workerUserProfile.full_name || "Worker",
          hirerName: "User",
          requestTitle: title,
          message,
          meetingTime: "",
          location: "",
        }),
        emailType: "new_request",
        meta: {
          booking_id: booking.id,
          created_at: now,
        },
      });
    }

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      status: booking.status,
    });
  } catch (error) {
    console.error("booking create error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}