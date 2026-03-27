import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = body as {
      userId?: string;
    };

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("id")
      .or(`hirer_user_id.eq.${userId},worker_user_id.eq.${userId}`);

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
      user_id: userId,
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
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}