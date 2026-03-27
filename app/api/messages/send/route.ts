import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const bookingId =
      typeof body?.bookingId === "string" ? body.bookingId.trim() : "";
    const content =
      typeof body?.content === "string" ? body.content.trim() : "";

    if (!bookingId || !content) {
      return NextResponse.json(
        { error: "Missing bookingId or content" },
        { status: 400 }
      );
    }

    const { data: booking, error: bookingError } = await adminSupabase
      .from("bookings")
      .select("id, hirer_user_id, worker_user_id, deleted_at")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError || !booking || booking.deleted_at) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const isParticipant =
      booking.hirer_user_id === user.id || booking.worker_user_id === user.id;

    if (!isParticipant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const receiverId =
      booking.hirer_user_id === user.id ? booking.worker_user_id : booking.hirer_user_id;

    const { data: insertedMessage, error: insertError } = await adminSupabase
      .from("messages")
      .insert({
        booking_id: bookingId,
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
        is_read,
        delivered,
        created_at
      `)
      .single();

    if (insertError || !insertedMessage) {
      return NextResponse.json(
        { error: insertError?.message || "Could not send message" },
        { status: 400 }
      );
    }

    await adminSupabase.from("notifications").insert({
      user_id: receiverId,
      type: "new_message",
      title: "New message",
      body: content.length > 120 ? `${content.slice(0, 120)}...` : content,
      meta: {
        booking_id: bookingId,
        sender_id: user.id,
        message_id: insertedMessage.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: insertedMessage,
    });
  } catch (error) {
    console.error("messages/send error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}