import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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
    const content = normalizeText(body?.content);

    if (!bookingId) {
      return NextResponse.json({ error: "Missing bookingId." }, { status: 400 });
    }

    if (!content) {
      return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
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
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    const isHirer = booking.hirer_user_id === user.id;
    const isWorker = booking.worker_user_id === user.id;

    if (!isHirer && !isWorker) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const receiverId = isHirer ? booking.worker_user_id : booking.hirer_user_id;
    const now = new Date().toISOString();

    const { data: insertedMessage, error: insertError } = await adminSupabase
      .from("messages")
      .insert({
        booking_id: booking.id,
        sender_id: user.id,
        receiver_id: receiverId,
        content,
        is_read: false,
        delivered: false,
      })
      .select(`
        id,
        booking_id,
        sender_id,
        receiver_id,
        content,
        created_at,
        is_read,
        delivered
      `)
      .single();

    if (insertError || !insertedMessage) {
      return NextResponse.json(
        { error: insertError?.message || "Could not send message." },
        { status: 400 }
      );
    }

    const { error: bookingUpdateError } = await adminSupabase
      .from("bookings")
      .update({
        seen_by_hirer: isHirer,
        seen_by_worker: isWorker,
        updated_at: now,
      })
      .eq("id", booking.id);

    if (bookingUpdateError) {
      console.error("messages/send booking update error:", bookingUpdateError);
    }

    const { data: senderProfile } = await adminSupabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", user.id)
      .maybeSingle();

    const preview =
      content.length > 120 ? `${content.slice(0, 120).trim()}…` : content;

    const { error: notificationError } = await adminSupabase
      .from("notifications")
      .insert({
        user_id: receiverId,
        type: "new_message",
        title: booking.title ? `New message about "${booking.title}"` : "New message",
        body: preview,
        meta: {
          booking_id: booking.id,
          message_id: insertedMessage.id,
          sender_id: user.id,
          sender_name: senderProfile?.full_name || "User",
          booking_status: booking.status,
          created_at: now,
        },
      });

    if (notificationError) {
      console.error("messages/send notification error:", notificationError);
    }

    return NextResponse.json({
      success: true,
      message: insertedMessage,
    });
  } catch (error) {
    console.error("messages/send error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}