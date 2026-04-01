import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { enqueueEmail } from "@/lib/email/queue";
import {
  bookingCancelledEmail,
  bookingCompletedEmail,
  workMarkedDoneEmail,
  workStartedEmail,
} from "@/lib/email/events";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ProgressAction =
  | "start_work"
  | "mark_done"
  | "complete_work"
  | "cancel_request";

type AllowedStatus =
  | "accepted"
  | "rejected"
  | "cancelled"
  | "completed"
  | "in_progress"
  | "worker_marked_done";

function normalizeAction(value: unknown): ProgressAction | null {
  if (typeof value !== "string") return null;

  const action = value.trim().toLowerCase();

  if (
    action === "start_work" ||
    action === "mark_done" ||
    action === "complete_work" ||
    action === "cancel_request"
  ) {
    return action;
  }

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
    console.error("booking progress system message error:", error);
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
    const bookingId =
      typeof body?.bookingId === "string" ? body.bookingId.trim() : "";
    const action = normalizeAction(body?.action);

    if (!bookingId || !action) {
      return NextResponse.json(
        { error: "Missing bookingId or action." },
        { status: 400 }
      );
    }

    const { data: booking, error: bookingError } = await adminSupabase
      .from("bookings")
      .select(
        `
        id,
        title,
        status,
        country,
        region,
        city,
        postcode,
        area_slug,
        hirer_user_id,
        worker_user_id,
        deleted_at
      `
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError || !booking || booking.deleted_at) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
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

    const now = new Date().toISOString();
    const bookingTitle = booking.title || "Untitled booking";
    const locationText = buildLocationText({
      country: booking.country,
      region: booking.region,
      city: booking.city,
      postcode: booking.postcode,
      areaSlug: booking.area_slug,
    });

    let nextStatus: AllowedStatus | null = null;
    let notifyUserId: string | null = null;
    let notificationTitle = "";
    let notificationBody = "";
    let systemMessage = "";

    if (action === "start_work") {
      if (!isWorker) {
        return NextResponse.json(
          { error: "Only the worker can start work." },
          { status: 403 }
        );
      }

      if (booking.status !== "accepted") {
        return NextResponse.json(
          { error: "Only accepted bookings can move to in progress." },
          { status: 409 }
        );
      }

      nextStatus = "in_progress";
      notifyUserId = booking.hirer_user_id;
      notificationTitle = "Work started";
      notificationBody = `Booking "${bookingTitle}" is now in progress.`;
      systemMessage = [
        `${workerProfile?.full_name || "Worker"} started work on "${bookingTitle}".`,
        `Location: ${locationText}.`,
      ].join(" ");
    }

    if (action === "mark_done") {
      if (!isWorker) {
        return NextResponse.json(
          { error: "Only the worker can mark work as done." },
          { status: 403 }
        );
      }

      if (booking.status !== "in_progress") {
        return NextResponse.json(
          { error: "Only work in progress can be marked done." },
          { status: 409 }
        );
      }

      nextStatus = "worker_marked_done";
      notifyUserId = booking.hirer_user_id;
      notificationTitle = "Worker marked booking as done";
      notificationBody = `The worker marked "${bookingTitle}" as done.`;
      systemMessage = [
        `${workerProfile?.full_name || "Worker"} marked "${bookingTitle}" as done.`,
        `Location: ${locationText}.`,
      ].join(" ");
    }

    if (action === "complete_work") {
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

      nextStatus = "completed";
      notifyUserId = booking.worker_user_id;
      notificationTitle = "Booking completed";
      notificationBody = `The booking "${bookingTitle}" has been completed.`;
      systemMessage = [
        `${hirerProfile?.full_name || "Hirer"} completed "${bookingTitle}".`,
        `Location: ${locationText}.`,
      ].join(" ");
    }

    if (action === "cancel_request") {
      if (booking.status === "completed") {
        return NextResponse.json(
          { error: "Completed bookings cannot be cancelled." },
          { status: 409 }
        );
      }

      if (booking.status === "cancelled") {
        return NextResponse.json(
          { error: "This booking is already cancelled." },
          { status: 409 }
        );
      }

      nextStatus = "cancelled";
      notifyUserId = isWorker ? booking.hirer_user_id : booking.worker_user_id;
      notificationTitle = "Booking cancelled";
      notificationBody = `Booking "${bookingTitle}" was cancelled.`;
      systemMessage = [
        `${
          isWorker
            ? workerProfile?.full_name || "Worker"
            : hirerProfile?.full_name || "Hirer"
        } cancelled "${bookingTitle}".`,
        `Location: ${locationText}.`,
      ].join(" ");
    }

    if (!nextStatus) {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {
      status: nextStatus,
      updated_at: now,
      seen_by_hirer: isHirer,
      seen_by_worker: isWorker,
    };

    if (nextStatus === "cancelled") {
      updatePayload.cancelled_at = now;
    }

    if (nextStatus === "completed") {
      updatePayload.completed_at = now;
    }

    const { error: updateError } = await adminSupabase
      .from("bookings")
      .update(updatePayload)
      .eq("id", booking.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Could not update booking." },
        { status: 400 }
      );
    }

    if (notifyUserId) {
      await adminSupabase.from("notifications").insert({
        user_id: notifyUserId,
        type: "booking_status_updated",
        title: notificationTitle,
        body: notificationBody,
        meta: {
          booking_id: booking.id,
          status: nextStatus,
          title: bookingTitle,
          location: locationText,
          updated_by: user.id,
          updated_at: now,
        },
      });
    }

    await insertSystemMessage({
      bookingId: booking.id,
      senderId: user.id,
      receiverId:
        notifyUserId || (isWorker ? booking.hirer_user_id : booking.worker_user_id),
      content: systemMessage,
    });

    if (nextStatus === "in_progress" && hirerProfile?.email) {
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
          status: nextStatus,
          updated_by: user.id,
          created_at: now,
        },
      });
    }

    if (nextStatus === "worker_marked_done" && hirerProfile?.email) {
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
          status: nextStatus,
          updated_by: user.id,
          created_at: now,
        },
      });
    }

    if (nextStatus === "completed" && workerProfile?.email) {
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
          status: nextStatus,
          updated_by: user.id,
          created_at: now,
        },
      });
    }

    if (nextStatus === "cancelled") {
      if (hirerProfile?.email) {
        await enqueueEmail({
          userId: hirerProfile.id,
          toEmail: hirerProfile.email,
          subject: "Booking cancelled",
          html: bookingCancelledEmail({
            userName: hirerProfile.full_name || "there",
            bookingTitle,
            location: locationText,
            reason: "This booking has been cancelled.",
          }),
          emailType: "booking_cancelled",
          meta: {
            booking_id: booking.id,
            status: nextStatus,
            updated_by: user.id,
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
            reason: "This booking has been cancelled.",
          }),
          emailType: "booking_cancelled",
          meta: {
            booking_id: booking.id,
            status: nextStatus,
            updated_by: user.id,
            created_at: now,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      status: nextStatus,
      message: "Booking updated successfully.",
    });
  } catch (error) {
    console.error("bookings/progress error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}