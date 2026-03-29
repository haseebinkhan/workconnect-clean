import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ActionType = "accepted" | "cancelled";

function normalizeAction(value: unknown): ActionType | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v === "accepted" || v === "cancelled") return v;
  return null;
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
  const base = parts.join(", ");
  return base || postcode || areaSlug || "Location not specified";
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const bookingId =
      typeof body?.bookingId === "string" ? body.bookingId.trim() : "";
    const action = normalizeAction(body?.action);

    if (!bookingId || !action) {
      return NextResponse.json(
        { error: "Missing bookingId or action." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const { data: booking, error: bookingError } = await adminSupabase
      .from("bookings")
      .select(
        `
        id,
        title,
        message,
        status,
        country,
        region,
        city,
        postcode,
        area_slug,
        budget_amount,
        currency_code,
        preferred_meeting_at,
        hirer_user_id,
        worker_user_id,
        deleted_at
      `
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError || !booking || booking.deleted_at) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }

    const isWorker = booking.worker_user_id === user.id;
    const isHirer = booking.hirer_user_id === user.id;

    if (!isWorker && !isHirer) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { data: hirerProfile } = await adminSupabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", booking.hirer_user_id)
      .maybeSingle();

    const { data: workerProfile } = await adminSupabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", booking.worker_user_id)
      .maybeSingle();

    const locationText = buildLocationText({
      country: booking.country,
      region: booking.region,
      city: booking.city,
      postcode: booking.postcode,
      areaSlug: booking.area_slug,
    });

    if (booking.status === "completed" || booking.status === "in_progress") {
      return NextResponse.json(
        { error: "This request can no longer be changed here." },
        { status: 409 }
      );
    }

    if (action === "accepted") {
      if (!isWorker) {
        return NextResponse.json(
          { error: "Only the worker can accept this request." },
          { status: 403 }
        );
      }

      if (booking.status !== "pending") {
        return NextResponse.json(
          { error: "Only pending requests can be accepted." },
          { status: 409 }
        );
      }

      const { error: updateError } = await adminSupabase
        .from("bookings")
        .update({
          status: "accepted",
          seen_by_worker: true,
          seen_by_hirer: false,
          updated_at: now,
        })
        .eq("id", booking.id);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 400 }
        );
      }

      const acceptedMessageParts = [
        `The request "${booking.title || "Work request"}" was accepted.`,
        booking.preferred_meeting_at
          ? `Meeting time: ${new Date(booking.preferred_meeting_at).toLocaleString("en-GB")}.`
          : "",
        `Location: ${locationText}.`,
        booking.budget_amount != null
          ? `Budget: ${booking.currency_code || "GBP"} ${booking.budget_amount}.`
          : "",
      ].filter(Boolean);

      const { error: messageError } = await adminSupabase.from("messages").insert({
        booking_id: booking.id,
        sender_id: booking.worker_user_id,
        receiver_id: booking.hirer_user_id,
        content: acceptedMessageParts.join(" "),
        is_read: false,
        delivered: false,
      });

      if (messageError) {
        console.error("booking accepted message insert error:", messageError);
      }

      await adminSupabase.from("notifications").insert([
        {
          user_id: booking.hirer_user_id,
          type: "worker_request_accepted",
          title: "Request accepted",
          body: `Your request "${booking.title}" was accepted.`,
          meta: {
            booking_id: booking.id,
            status: "accepted",
            worker_user_id: booking.worker_user_id,
            worker_name: workerProfile?.full_name || "Worker",
            location: locationText,
            updated_at: now,
          },
        },
        {
          user_id: booking.worker_user_id,
          type: "worker_request_status",
          title: "You accepted a request",
          body: `You accepted "${booking.title}".`,
          meta: {
            booking_id: booking.id,
            status: "accepted",
            hirer_user_id: booking.hirer_user_id,
            hirer_name: hirerProfile?.full_name || "Hirer",
            location: locationText,
            updated_at: now,
          },
        },
      ]);

      return NextResponse.json({
        success: true,
        status: "accepted",
        message: "Request accepted successfully.",
      });
    }

    if (booking.status === "cancelled") {
      return NextResponse.json(
        { error: "This request is already cancelled." },
        { status: 409 }
      );
    }

    const { error: cancelError } = await adminSupabase
      .from("bookings")
      .update({
        status: "cancelled",
        seen_by_worker: isWorker ? true : false,
        seen_by_hirer: isHirer ? true : false,
        updated_at: now,
      })
      .eq("id", booking.id);

    if (cancelError) {
      return NextResponse.json(
        { error: cancelError.message },
        { status: 400 }
      );
    }

    const notifyUserId = isWorker ? booking.hirer_user_id : booking.worker_user_id;
    const cancellerName = isWorker
      ? workerProfile?.full_name || "Worker"
      : hirerProfile?.full_name || "Hirer";

    const cancelMessageParts = [
      `The request "${booking.title || "Work request"}" was cancelled by ${cancellerName}.`,
      `Location: ${locationText}.`,
    ].filter(Boolean);

    const { error: messageError } = await adminSupabase.from("messages").insert({
      booking_id: booking.id,
      sender_id: user.id,
      receiver_id: notifyUserId,
      content: cancelMessageParts.join(" "),
      is_read: false,
      delivered: false,
    });

    if (messageError) {
      console.error("booking cancelled message insert error:", messageError);
    }

    await adminSupabase.from("notifications").insert({
      user_id: notifyUserId,
      type: "worker_request_cancelled",
      title: "Request cancelled",
      body: `The request "${booking.title}" was cancelled.`,
      meta: {
        booking_id: booking.id,
        status: "cancelled",
        cancelled_by: user.id,
        cancelled_by_name: cancellerName,
        location: locationText,
        updated_at: now,
      },
    });

    return NextResponse.json({
      success: true,
      status: "cancelled",
      message: "Request cancelled successfully.",
    });
  } catch (error) {
    console.error("bookings/update-status error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}