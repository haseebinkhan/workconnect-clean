import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { enqueueEmail } from "@/lib/email/queue";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALLOWED_STATUSES = [
  "accepted",
  "rejected",
  "cancelled",
  "completed",
  "in_progress",
  "worker_marked_done",
] as const;

type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isAllowedStatus(value: string): value is AllowedStatus {
  return ALLOWED_STATUSES.includes(value as AllowedStatus);
}

function bookingAcceptedEmail({
  workerName,
  hirerName,
  bookingTitle,
}: {
  workerName: string;
  hirerName: string;
  bookingTitle: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; background:#f8fafc; padding:24px;">
      <div style="max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">
        <div style="padding:24px;">
          <h2 style="margin:0 0 16px; color:#0f172a;">Booking accepted</h2>
          <p style="color:#334155;">Hi ${hirerName},</p>
          <p style="color:#334155;">
            Your booking request <strong>${bookingTitle}</strong> has been accepted by ${workerName}.
          </p>
          <p style="margin-top:24px; color:#64748b; font-size:13px;">WorkConnect</p>
        </div>
      </div>
    </div>
  `;
}

function bookingCancelledEmail({
  userName,
  bookingTitle,
  reason,
}: {
  userName: string;
  bookingTitle: string;
  reason: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; background:#f8fafc; padding:24px;">
      <div style="max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">
        <div style="padding:24px;">
          <h2 style="margin:0 0 16px; color:#0f172a;">Booking update</h2>
          <p style="color:#334155;">Hi ${userName},</p>
          <p style="color:#334155;">
            Booking <strong>${bookingTitle}</strong> has been updated.
          </p>
          <p style="color:#334155;"><strong>Reason:</strong> ${reason}</p>
          <p style="margin-top:24px; color:#64748b; font-size:13px;">WorkConnect</p>
        </div>
      </div>
    </div>
  `;
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

    const bookingId = normalizeText(body?.bookingId);
    const status = normalizeText(body?.status).toLowerCase();
    const reason = normalizeText(body?.reason);

    if (!bookingId || !status) {
      return NextResponse.json(
        { error: "Missing bookingId or status." },
        { status: 400 }
      );
    }

    if (!isAllowedStatus(status)) {
      return NextResponse.json(
        { error: "Invalid booking status." },
        { status: 400 }
      );
    }

    const { data: booking, error: bookingError } = await adminSupabase
      .from("bookings")
      .select(
        `
        id,
        title,
        message,
        status,
        hirer_user_id,
        worker_user_id,
        worker_profile_id,
        preferred_meeting_at,
        country,
        region,
        city,
        postcode,
        area_slug,
        deleted_at
      `
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError || !booking || booking.deleted_at) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    const isHirer = booking.hirer_user_id === user.id;
    const isWorker = booking.worker_user_id === user.id;

    if (!isHirer && !isWorker) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (status === "accepted" && !isWorker) {
      return NextResponse.json(
        { error: "Only the worker can accept a request." },
        { status: 403 }
      );
    }

    if (status === "rejected" && !isWorker) {
      return NextResponse.json(
        { error: "Only the worker can reject a request." },
        { status: 403 }
      );
    }

    if (status === "cancelled" && !isHirer && !isWorker) {
      return NextResponse.json(
        { error: "Only involved users can cancel a booking." },
        { status: 403 }
      );
    }

    if (status === "worker_marked_done" && !isWorker) {
      return NextResponse.json(
        { error: "Only the worker can mark the booking as done." },
        { status: 403 }
      );
    }

    if (status === "completed" && !isHirer) {
      return NextResponse.json(
        { error: "Only the hirer can complete the booking." },
        { status: 403 }
      );
    }

    if (status === "in_progress" && !isWorker) {
      return NextResponse.json(
        { error: "Only the worker can start the booking." },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();

    const updatePayload: Record<string, unknown> = {
      status,
      updated_at: now,
    };

    if (status === "cancelled") {
      updatePayload.cancelled_at = now;
    }

    if (status === "completed") {
      updatePayload.completed_at = now;
    }

    const { error: updateError } = await adminSupabase
      .from("bookings")
      .update(updatePayload)
      .eq("id", bookingId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Could not update booking." },
        { status: 400 }
      );
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

    const bookingTitle = booking.title || "Untitled booking";

    if (status === "accepted") {
      await adminSupabase.from("notifications").insert([
        {
          user_id: booking.hirer_user_id,
          type: "booking_accepted",
          title: "Booking accepted",
          body: `Your request "${bookingTitle}" has been accepted.`,
          meta: {
            booking_id: booking.id,
            status,
            created_at: now,
          },
        },
        {
          user_id: booking.worker_user_id,
          type: "booking_status_updated",
          title: "You accepted a booking",
          body: `You accepted booking "${bookingTitle}".`,
          meta: {
            booking_id: booking.id,
            status,
            created_at: now,
          },
        },
      ]);

      if (hirerProfile?.email) {
        await enqueueEmail({
          userId: hirerProfile.id,
          toEmail: hirerProfile.email,
          subject: "Your booking request was accepted",
          html: bookingAcceptedEmail({
            workerName: workerProfile?.full_name || "the worker",
            hirerName: hirerProfile.full_name || "there",
            bookingTitle,
          }),
        });
      }
    }

    if (status === "rejected") {
      await adminSupabase.from("notifications").insert([
        {
          user_id: booking.hirer_user_id,
          type: "booking_rejected",
          title: "Booking rejected",
          body: `Your request "${bookingTitle}" was rejected.`,
          meta: {
            booking_id: booking.id,
            status,
            reason: reason || null,
            created_at: now,
          },
        },
        {
          user_id: booking.worker_user_id,
          type: "booking_status_updated",
          title: "You rejected a booking",
          body: `You rejected booking "${bookingTitle}".`,
          meta: {
            booking_id: booking.id,
            status,
            reason: reason || null,
            created_at: now,
          },
        },
      ]);

      if (hirerProfile?.email) {
        await enqueueEmail({
          userId: hirerProfile.id,
          toEmail: hirerProfile.email,
          subject: "Your booking request was rejected",
          html: bookingCancelledEmail({
            userName: hirerProfile.full_name || "there",
            bookingTitle,
            reason: reason || "The worker could not accept this request.",
          }),
        });
      }
    }

    if (status === "cancelled") {
      const cancelledBy = isHirer ? "hirer" : "worker";

      await adminSupabase.from("notifications").insert([
        {
          user_id: booking.hirer_user_id,
          type: "booking_cancelled",
          title: "Booking cancelled",
          body: `Booking "${bookingTitle}" was cancelled.`,
          meta: {
            booking_id: booking.id,
            status,
            cancelled_by: cancelledBy,
            reason: reason || null,
            created_at: now,
          },
        },
        {
          user_id: booking.worker_user_id,
          type: "booking_cancelled",
          title: "Booking cancelled",
          body: `Booking "${bookingTitle}" was cancelled.`,
          meta: {
            booking_id: booking.id,
            status,
            cancelled_by: cancelledBy,
            reason: reason || null,
            created_at: now,
          },
        },
      ]);

      if (hirerProfile?.email) {
        await enqueueEmail({
          userId: hirerProfile.id,
          toEmail: hirerProfile.email,
          subject: "Booking cancelled",
          html: bookingCancelledEmail({
            userName: hirerProfile.full_name || "there",
            bookingTitle,
            reason: reason || "This booking has been cancelled.",
          }),
        });
      }

      if (workerProfile?.email) {
        await enqueueEmail({
          userId: workerProfile.id,
          toEmail: workerProfile.email,
          subject: "Booking cancelled",
          html: bookingCancelledEmail({
            userName: workerProfile.full_name || "there",
            bookingTitle,
            reason: reason || "This booking has been cancelled.",
          }),
        });
      }
    }

    if (status === "in_progress") {
      await adminSupabase.from("notifications").insert({
        user_id: booking.hirer_user_id,
        type: "booking_in_progress",
        title: "Booking started",
        body: `Booking "${bookingTitle}" is now in progress.`,
        meta: {
          booking_id: booking.id,
          status,
          created_at: now,
        },
      });
    }

    if (status === "worker_marked_done") {
      await adminSupabase.from("notifications").insert({
        user_id: booking.hirer_user_id,
        type: "booking_worker_marked_done",
        title: "Worker marked booking as done",
        body: `Booking "${bookingTitle}" was marked as done by the worker.`,
        meta: {
          booking_id: booking.id,
          status,
          created_at: now,
        },
      });
    }

    if (status === "completed") {
      await adminSupabase.from("notifications").insert([
        {
          user_id: booking.hirer_user_id,
          type: "booking_completed",
          title: "Booking completed",
          body: `You marked booking "${bookingTitle}" as completed.`,
          meta: {
            booking_id: booking.id,
            status,
            created_at: now,
          },
        },
        {
          user_id: booking.worker_user_id,
          type: "booking_completed",
          title: "Booking completed",
          body: `Booking "${bookingTitle}" was marked as completed.`,
          meta: {
            booking_id: booking.id,
            status,
            created_at: now,
          },
        },
      ]);
    }

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      status,
      message: "Booking status updated successfully.",
    });
  } catch (error) {
    console.error("bookings/update-status error:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}