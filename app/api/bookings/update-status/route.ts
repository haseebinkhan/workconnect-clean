import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { enqueueEmail } from "@/lib/email/queue";
import {
  bookingAcceptedEmail,
  bookingCancelledEmail,
  bookingCompletedEmail,
  bookingRejectedEmail,
  workMarkedDoneEmail,
  workStartedEmail,
} from "@/lib/email/events";

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

async function insertSystemMessage(params: {
  bookingId: string;
  senderId: string;
  receiverId: string;
  content: string;
}) {
  const { error } = await adminSupabase.from("messages").insert({
    booking_id: params.bookingId,
    sender_id: params.senderId,
    receiver_id: params.receiverId,
    content: params.content,
    is_read: false,
    delivered: false,
  });

  if (error) {
    console.error("booking status system message error:", error);
  }
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

    if (booking.status === "completed") {
      return NextResponse.json(
        { error: "Completed bookings cannot be changed." },
        { status: 409 }
      );
    }

    if (booking.status === "cancelled") {
      return NextResponse.json(
        { error: "Cancelled bookings cannot be changed." },
        { status: 409 }
      );
    }

    if (status === "accepted") {
      if (!isWorker) {
        return NextResponse.json(
          { error: "Only the worker can accept a request." },
          { status: 403 }
        );
      }

      if (booking.status !== "pending") {
        return NextResponse.json(
          { error: "Only pending bookings can be accepted." },
          { status: 409 }
        );
      }
    }

    if (status === "rejected") {
      if (!isWorker) {
        return NextResponse.json(
          { error: "Only the worker can reject a request." },
          { status: 403 }
        );
      }

      if (booking.status !== "pending") {
        return NextResponse.json(
          { error: "Only pending bookings can be rejected." },
          { status: 409 }
        );
      }
    }

    if (status === "cancelled") {
      if (!isHirer && !isWorker) {
        return NextResponse.json(
          { error: "Only involved users can cancel a booking." },
          { status: 403 }
        );
      }
    }

    if (status === "in_progress") {
      if (!isWorker) {
        return NextResponse.json(
          { error: "Only the worker can start the booking." },
          { status: 403 }
        );
      }

      if (booking.status !== "accepted") {
        return NextResponse.json(
          { error: "Only accepted bookings can move to in progress." },
          { status: 409 }
        );
      }
    }

    if (status === "worker_marked_done") {
      if (!isWorker) {
        return NextResponse.json(
          { error: "Only the worker can mark the booking as done." },
          { status: 403 }
        );
      }

      if (booking.status !== "in_progress") {
        return NextResponse.json(
          { error: "Only in-progress bookings can be marked done." },
          { status: 409 }
        );
      }
    }

    if (status === "completed") {
      if (!isHirer) {
        return NextResponse.json(
          { error: "Only the hirer can complete the booking." },
          { status: 403 }
        );
      }

      if (booking.status !== "worker_marked_done") {
        return NextResponse.json(
          { error: "Only worker-marked-done bookings can be completed." },
          { status: 409 }
        );
      }
    }

    const now = new Date().toISOString();
    const bookingTitle = booking.title || "Untitled booking";
    const locationText = buildLocationText({
      country: booking.country,
      region: booking.region,
      city: booking.city,
      postcode: booking.postcode,
      areaSlug: booking.area_slug,
    });

    const updatePayload: Record<string, unknown> = {
      status,
      updated_at: now,
      seen_by_hirer: isHirer,
      seen_by_worker: isWorker,
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

      await insertSystemMessage({
        bookingId: booking.id,
        senderId: booking.worker_user_id,
        receiverId: booking.hirer_user_id,
        content: `${workerProfile?.full_name || "Worker"} accepted "${bookingTitle}".`,
      });

      if (hirerProfile?.email) {
        await enqueueEmail({
          userId: hirerProfile.id,
          toEmail: hirerProfile.email,
          subject: "Your booking request was accepted",
          html: bookingAcceptedEmail({
            userName: hirerProfile.full_name || "there",
            bookingTitle,
            location: locationText,
          }),
          emailType: "booking_accepted",
          meta: {
            booking_id: booking.id,
            status,
            created_at: now,
          },
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

      await insertSystemMessage({
        bookingId: booking.id,
        senderId: booking.worker_user_id,
        receiverId: booking.hirer_user_id,
        content: `${workerProfile?.full_name || "Worker"} rejected "${bookingTitle}".`,
      });

      if (hirerProfile?.email) {
        await enqueueEmail({
          userId: hirerProfile.id,
          toEmail: hirerProfile.email,
          subject: "Your booking request was rejected",
          html: bookingRejectedEmail({
            userName: hirerProfile.full_name || "there",
            bookingTitle,
            location: locationText,
          }),
          emailType: "booking_rejected",
          meta: {
            booking_id: booking.id,
            status,
            reason: reason || null,
            created_at: now,
          },
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

      await insertSystemMessage({
        bookingId: booking.id,
        senderId: user.id,
        receiverId: isWorker ? booking.hirer_user_id : booking.worker_user_id,
        content: `${
          isWorker
            ? workerProfile?.full_name || "Worker"
            : hirerProfile?.full_name || "Hirer"
        } cancelled "${bookingTitle}".`,
      });

      if (hirerProfile?.email) {
        await enqueueEmail({
          userId: hirerProfile.id,
          toEmail: hirerProfile.email,
          subject: "Booking cancelled",
          html: bookingCancelledEmail({
            userName: hirerProfile.full_name || "there",
            bookingTitle,
            location: locationText,
            reason: reason || "This booking has been cancelled.",
          }),
          emailType: "booking_cancelled",
          meta: {
            booking_id: booking.id,
            status,
            cancelled_by: cancelledBy,
            reason: reason || null,
            created_at: now,
          },
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
            location: locationText,
            reason: reason || "This booking has been cancelled.",
          }),
          emailType: "booking_cancelled",
          meta: {
            booking_id: booking.id,
            status,
            cancelled_by: cancelledBy,
            reason: reason || null,
            created_at: now,
          },
        });
      }
    }

    if (status === "in_progress") {
      await adminSupabase.from("notifications").insert([
        {
          user_id: booking.hirer_user_id,
          type: "booking_in_progress",
          title: "Booking started",
          body: `Booking "${bookingTitle}" is now in progress.`,
          meta: {
            booking_id: booking.id,
            status,
            created_at: now,
          },
        },
        {
          user_id: booking.worker_user_id,
          type: "booking_status_updated",
          title: "Work started",
          body: `You started work on "${bookingTitle}".`,
          meta: {
            booking_id: booking.id,
            status,
            created_at: now,
          },
        },
      ]);

      await insertSystemMessage({
        bookingId: booking.id,
        senderId: booking.worker_user_id,
        receiverId: booking.hirer_user_id,
        content: `${workerProfile?.full_name || "Worker"} started work on "${bookingTitle}". Location: ${locationText}.`,
      });

      if (hirerProfile?.email) {
        await enqueueEmail({
          userId: hirerProfile.id,
          toEmail: hirerProfile.email,
          subject: "Work started",
          html: workStartedEmail({
            userName: hirerProfile.full_name || "there",
            bookingTitle,
            location: locationText,
          }),
          emailType: "booking_in_progress",
          meta: {
            booking_id: booking.id,
            status,
            created_at: now,
          },
        });
      }
    }

    if (status === "worker_marked_done") {
      await adminSupabase.from("notifications").insert([
        {
          user_id: booking.hirer_user_id,
          type: "booking_worker_marked_done",
          title: "Worker marked booking as done",
          body: `Booking "${bookingTitle}" was marked as done by the worker.`,
          meta: {
            booking_id: booking.id,
            status,
            created_at: now,
          },
        },
        {
          user_id: booking.worker_user_id,
          type: "booking_status_updated",
          title: "You marked work as done",
          body: `You marked "${bookingTitle}" as done.`,
          meta: {
            booking_id: booking.id,
            status,
            created_at: now,
          },
        },
      ]);

      await insertSystemMessage({
        bookingId: booking.id,
        senderId: booking.worker_user_id,
        receiverId: booking.hirer_user_id,
        content: `${workerProfile?.full_name || "Worker"} marked "${bookingTitle}" as done. Location: ${locationText}.`,
      });

      if (hirerProfile?.email) {
        await enqueueEmail({
          userId: hirerProfile.id,
          toEmail: hirerProfile.email,
          subject: "Worker marked booking as done",
          html: workMarkedDoneEmail({
            userName: hirerProfile.full_name || "there",
            bookingTitle,
            location: locationText,
          }),
          emailType: "booking_worker_marked_done",
          meta: {
            booking_id: booking.id,
            status,
            created_at: now,
          },
        });
      }
    }

    if (status === "completed") {
      await adminSupabase.from("notifications").insert([
        {
          user_id: booking.worker_user_id,
          type: "booking_completed",
          title: "Booking completed",
          body: `Booking "${bookingTitle}" has been completed.`,
          meta: {
            booking_id: booking.id,
            status,
            created_at: now,
          },
        },
        {
          user_id: booking.hirer_user_id,
          type: "booking_status_updated",
          title: "You completed a booking",
          body: `You completed "${bookingTitle}".`,
          meta: {
            booking_id: booking.id,
            status,
            created_at: now,
          },
        },
      ]);

      await insertSystemMessage({
        bookingId: booking.id,
        senderId: booking.hirer_user_id,
        receiverId: booking.worker_user_id,
        content: `${hirerProfile?.full_name || "Hirer"} completed "${bookingTitle}". Location: ${locationText}.`,
      });

      if (workerProfile?.email) {
        await enqueueEmail({
          userId: workerProfile.id,
          toEmail: workerProfile.email,
          subject: "Booking completed",
          html: bookingCompletedEmail({
            userName: workerProfile.full_name || "there",
            bookingTitle,
            location: locationText,
          }),
          emailType: "booking_completed",
          meta: {
            booking_id: booking.id,
            status,
            created_at: now,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
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