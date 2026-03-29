import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    if (!bookingId) {
      return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
    }

    const { data: booking, error: bookingError } = await adminSupabase
      .from("bookings")
      .select("id, hirer_user_id, worker_user_id, deleted_at")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError || !booking || booking.deleted_at) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const isParticipant =
      booking.hirer_user_id === user.id || booking.worker_user_id === user.id;

    if (!isParticipant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: upsertError } = await adminSupabase
      .from("deleted_chats")
      .upsert(
        {
          booking_id: bookingId,
          user_id: user.id,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: "booking_id,user_id",
        }
      );

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Chat deleted successfully.",
    });
  } catch (error) {
    console.error("messages/delete-chat error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

