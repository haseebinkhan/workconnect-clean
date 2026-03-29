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
        title,
        message,
        status,
        budget_amount,
        currency_code,
        country,
        region,
        city,
        postcode,
        area_slug,
        preferred_meeting_at,
        hirer_user_id,
        worker_user_id,
        seen_by_hirer,
        seen_by_worker,
        created_at,
        updated_at,
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
        delivered
      `)
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: true });

    if (messagesError) {
      return NextResponse.json(
        { error: messagesError.message || "Could not load messages." },
        { status: 400 }
      );
    }

    const participantIds = [booking.hirer_user_id, booking.worker_user_id].filter(Boolean);

    const { data: profiles } = participantIds.length
      ? await adminSupabase
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .in("id", participantIds)
      : { data: [] };

    const profileMap = new Map((profiles || []).map((item) => [item.id, item]));

    const hirer = profileMap.get(booking.hirer_user_id);
    const worker = profileMap.get(booking.worker_user_id);

    return NextResponse.json({
      success: true,
      booking,
      messages: messages || [],
      participants: {
        hirer: hirer
          ? {
              id: hirer.id,
              full_name: hirer.full_name || null,
              email: hirer.email || null,
              avatar_url: hirer.avatar_url || null,
            }
          : null,
        worker: worker
          ? {
              id: worker.id,
              full_name: worker.full_name || null,
              email: worker.email || null,
              avatar_url: worker.avatar_url || null,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("messages/get error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}