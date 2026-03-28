import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

    if (!bookingId) {
      return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
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

    const { error } = await adminSupabase
      .from("messages")
      .update({ delivered: true })
      .eq("booking_id", bookingId)
      .neq("sender_id", user.id)
      .or("delivered.is.null,delivered.eq.false");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("messages/delivered error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
