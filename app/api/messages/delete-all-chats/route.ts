import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: bookingRows, error: bookingsError } = await adminSupabase
      .from("bookings")
      .select("id")
      .or(`hirer_user_id.eq.${user.id},worker_user_id.eq.${user.id}`)
      .is("deleted_at", null);

    if (bookingsError) {
      return NextResponse.json({ error: bookingsError.message }, { status: 400 });
    }

    const bookingIds = (bookingRows || []).map((row) => row.id);

    if (bookingIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No chats found.",
      });
    }

    const deletedRows = bookingIds.map((bookingId) => ({
      booking_id: bookingId,
      user_id: user.id,
      created_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await adminSupabase
      .from("deleted_chats")
      .upsert(deletedRows, {
        onConflict: "booking_id,user_id",
      });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "All chats removed successfully.",
    });
  } catch (error) {
    console.error("messages/delete-all-chats error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}