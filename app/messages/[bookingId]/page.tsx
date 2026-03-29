import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BookingMessagesClient from "./BookingMessagesClient";

export default async function Page({
  params,
}: {
  params: { bookingId: string };
}) {
  const { bookingId } = params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: booking, error: bookingError } = await supabase
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
      created_at,
      deleted_at
    `)
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError || !booking || booking.deleted_at) {
    redirect("/messages");
  }

  const isParticipant =
    booking.hirer_user_id === user.id || booking.worker_user_id === user.id;

  if (!isParticipant) {
    redirect("/messages");
  }

  const { data: messages } = await supabase
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
    .eq("booking_id", booking.id)
    .order("created_at", { ascending: true });

  const participantIds = [booking.hirer_user_id, booking.worker_user_id].filter(
    Boolean
  );

  const { data: profiles } = participantIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", participantIds)
    : { data: [] as Array<{ id: string; full_name: string | null; email: string | null }> };

  const profileMap = new Map((profiles || []).map((item) => [item.id, item]));

  const hirer = profileMap.get(booking.hirer_user_id);
  const worker = profileMap.get(booking.worker_user_id);

  return (
    <BookingMessagesClient
      bookingId={booking.id}
      currentUserId={user.id}
      initialBooking={{
        id: booking.id,
        title: booking.title,
        message: booking.message,
        status: booking.status,
        budget_amount: booking.budget_amount,
        currency_code: booking.currency_code,
        country: booking.country,
        region: booking.region,
        city: booking.city,
        postcode: booking.postcode,
        area_slug: booking.area_slug,
        preferred_meeting_at: booking.preferred_meeting_at,
        hirer_user_id: booking.hirer_user_id,
        worker_user_id: booking.worker_user_id,
        created_at: booking.created_at,
      }}
      initialMessages={messages || []}
      initialParticipants={{
        hirer: hirer
          ? {
              id: hirer.id,
              full_name: hirer.full_name,
              email: hirer.email,
            }
          : null,
        worker: worker
          ? {
              id: worker.id,
              full_name: worker.full_name,
              email: worker.email,
            }
          : null,
      }}
    />
  );
}