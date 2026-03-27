import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bookingId = req.nextUrl.searchParams.get("bookingId")?.trim();

    if (!bookingId) {
      return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
    }

    const { data: booking, error: bookingError } = await adminSupabase
      .from("bookings")
      .select(`
        id,
        title,
        hirer_user_id,
        worker_user_id,
        deleted_at
      `)
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

    const otherUserId =
      booking.hirer_user_id === user.id ? booking.worker_user_id : booking.hirer_user_id;

    const { data: otherProfile } = await adminSupabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", otherUserId)
      .maybeSingle();

    const { data: messages, error: messagesError } = await adminSupabase
      .from("messages")
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
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      return NextResponse.json({ error: messagesError.message }, { status: 400 });
    }

    return NextResponse.json({
      booking: {
        id: booking.id,
        title: booking.title || "Conversation",
        hirer_user_id: booking.hirer_user_id,
        worker_user_id: booking.worker_user_id,
        other_user_name: otherProfile?.full_name || "Recipient",
      },
      messages: messages || [],
    });
  } catch (error) {
    console.error("messages/get error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}