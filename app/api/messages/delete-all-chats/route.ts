import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("id")
      .or(`hirer_user_id.eq.${user.id},worker_user_id.eq.${user.id}`);

    if (bookingsError) {
      return NextResponse.json(
        { error: bookingsError.message },
        { status: 400 }
      );
    }

    const bookingIds = (bookings || []).map((b) => b.id);

    if (bookingIds.length === 0) {
      return NextResponse.json({ success: true, deletedCount: 0 });
    }

    const rows = bookingIds.map((bookingId) => ({
      booking_id: bookingId,
      user_id: user.id,
    }));

    const { error: upsertError } = await supabase
      .from("deleted_chats")
      .upsert(rows, {
        onConflict: "booking_id,user_id",
      });

    if (upsertError) {
      return NextResponse.json(
        { error: upsertError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedCount: bookingIds.length,
    });
  } catch (error) {
    console.error("delete-all-chats error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
