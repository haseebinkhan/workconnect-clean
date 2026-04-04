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
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const bookingId = normalizeText(body?.bookingId);

    if (!bookingId) {
      return NextResponse.json({ error: "Missing bookingId." }, { status: 400 });
    }

    const { data: booking } = await adminSupabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    const isParticipant =
      booking.hirer_user_id === user.id ||
      booking.worker_user_id === user.id;

    if (!isParticipant) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    // 🔥 FIXED QUERY
    const { data: messages, error: messagesError } = await adminSupabase
      .from("messages")
      .select(`
        id,
        booking_id,
        sender_id,
        receiver_id,
        content,
        created_at,
        is_read,
        delivered,
        message_type
      `)
      .eq("booking_id", bookingId)
      .not("content", "is", null) // ✅ FIX 1
      .neq("content", "")         // ✅ FIX 2
      .order("created_at", { ascending: true });

    if (messagesError) {
      return NextResponse.json(
        { error: messagesError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      booking,
      messages: messages || [],
    });
  } catch (error) {
    console.error("messages/get error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}