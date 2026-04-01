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

    if (!bookingId) {
      return NextResponse.json({ error: "Missing bookingId." }, { status: 400 });
    }

    const { data: booking, error: bookingError } = await adminSupabase
      .from("bookings")
      .select(`
        id,
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

    const { error: readError } = await adminSupabase
      .from("messages")
      .update({ is_read: true })
      .eq("booking_id", booking.id)
      .eq("receiver_id", user.id)
      .or("is_read.is.null,is_read.eq.false");

    if (readError) {
      return NextResponse.json({ error: readError.message }, { status: 400 });
    }

    const now = new Date().toISOString();

    const seenUpdate = isHirer
      ? { seen_by_hirer: true, updated_at: now }
      : { seen_by_worker: true, updated_at: now };

    const { error: bookingSeenError } = await adminSupabase
      .from("bookings")
      .update(seenUpdate)
      .eq("id", booking.id);

    if (bookingSeenError) {
      console.error("messages/read booking seen update error:", bookingSeenError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("messages/read error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
