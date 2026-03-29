import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ProgressAction =
  | "start_work"
  | "mark_done"
  | "complete_work"
  | "cancel_request";

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
      .select(`
        id,
        title,
        status,
        hirer_user_id,
        worker_user_id,
        deleted_at
      `)
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

    let nextStatus: string | null = null;
    let notifyUserId: string | null = null;
    let notificationTitle = "";
    let notificationBody = "";

    if (action === "start_work") {
      if (!isHirer) {
        return NextResponse.json(
          { error: "Only the hirer can start work." },
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
      notifyUserId = booking.worker_user_id;
      notificationTitle = "Work started";
      notificationBody = `The booking "${booking.title}" has been marked as in progress.`;
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
      notificationTitle = "Worker marked job done";
      notificationBody = `The worker marked "${booking.title}" as done. Please review and complete it.`;
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
      notificationBody = `The booking "${booking.title}" has been completed.`;
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
      notificationBody = `The booking "${booking.title}" has been cancelled.`;
    }

    if (!nextStatus) {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const { error: updateError } = await adminSupabase
      .from("bookings")
      .update({
        status: nextStatus,
        seen_by_hirer: isHirer,
        seen_by_worker: isWorker,
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
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
        },
      });
    }

    return NextResponse.json({
      success: true,
      status: nextStatus,
      message: "Booking updated successfully.",
    });
  } catch (error) {
    console.error("bookings/progress error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

