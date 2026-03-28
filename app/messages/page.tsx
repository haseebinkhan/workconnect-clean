import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DeleteChatButton from "@/components/messages/DeleteChatButton";

function formatDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function compactText(value?: string | null, max = 120) {
  const text = (value || "").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}

function formatLocation(input: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
  postcode?: string | null;
  area_slug?: string | null;
}) {
  const parts = [input.city, input.region, input.country].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  if (input.postcode) return input.postcode;
  if (input.area_slug) return input.area_slug;
  return "Location not specified";
}

function statusClasses(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "accepted":
      return "bg-emerald-50 text-emerald-700";
    case "in_progress":
      return "bg-indigo-50 text-indigo-700";
    case "worker_marked_done":
      return "bg-violet-50 text-violet-700";
    case "completed":
      return "bg-sky-50 text-sky-700";
    case "cancelled":
      return "bg-rose-50 text-rose-700";
    default:
      return "bg-amber-50 text-amber-700";
  }
}

export default async function MessagesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: deletedRows } = await supabase
    .from("deleted_chats")
    .select("booking_id")
    .eq("user_id", user.id);

  const deletedBookingIds = (deletedRows || []).map((row) => row.booking_id);

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(`
      id,
      title,
      hirer_user_id,
      worker_user_id,
      status,
      city,
      country,
      postcode,
      area_slug,
      created_at,
      updated_at,
      deleted_at
    `)
    .or(`hirer_user_id.eq.${user.id},worker_user_id.eq.${user.id}`)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8">
        <section className="mx-auto max-w-5xl">
          <div className="rounded-[2rem] border border-red-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
            <p className="mt-3 text-sm text-red-600">
              {error.message || "Could not load messages."}
            </p>
          </div>
        </section>
      </main>
    );
  }

  const visibleBookings = (bookings || []).filter(
    (booking) => !deletedBookingIds.includes(booking.id)
  );

  const otherUserIds = [
    ...new Set(
      visibleBookings.map((booking) =>
        booking.hirer_user_id === user.id
          ? booking.worker_user_id
          : booking.hirer_user_id
      )
    ),
  ];

  const { data: profiles } = otherUserIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", otherUserIds)
    : { data: [] };

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  const bookingIds = visibleBookings.map((b) => b.id);

  const { data: messages } = bookingIds.length
    ? await supabase
        .from("messages")
        .select(`
          id,
          booking_id,
          sender_id,
          receiver_id,
          content,
          is_read,
          delivered,
          created_at,
          deleted_by_sender,
          deleted_by_receiver
        `)
        .in("booking_id", bookingIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const latestVisibleMessageByBooking = new Map<string, any>();

  for (const msg of messages || []) {
    const hiddenForCurrentUser =
      (msg.sender_id === user.id && msg.deleted_by_sender) ||
      (msg.receiver_id === user.id && msg.deleted_by_receiver);

    if (hiddenForCurrentUser) continue;

    if (!latestVisibleMessageByBooking.has(msg.booking_id)) {
      latestVisibleMessageByBooking.set(msg.booking_id, msg);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-medium text-slate-500">Inbox</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Messages
          </h1>
        </div>

        {visibleBookings.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">No chats yet</h2>
            <p className="mt-2 text-sm text-slate-600">
              Your active conversations will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleBookings.map((booking) => {
              const otherUserId =
                booking.hirer_user_id === user.id
                  ? booking.worker_user_id
                  : booking.hirer_user_id;

              const otherProfile = profileMap.get(otherUserId);
              const latestMessage = latestVisibleMessageByBooking.get(booking.id);

              const bookingLocation = formatLocation({
                city: booking.city,
                country: booking.country,
                postcode: booking.postcode,
                area_slug: booking.area_slug,
              });

              return (
                <div
                  key={booking.id}
                  className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <Link href={`/messages/${booking.id}`} className="block">
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-xl font-bold text-slate-900">
                            {otherProfile?.full_name || "Recipient"}
                          </h2>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClasses(
                              booking.status
                            )}`}
                          >
                            {booking.status}
                          </span>
                        </div>

                        <p className="mt-2 text-sm font-medium text-slate-500">
                          {booking.title || "Conversation"}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {bookingLocation}
                        </p>

                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {latestMessage
                            ? compactText(latestMessage.content, 120)
                            : "No visible messages yet."}
                        </p>

                        <p className="mt-3 text-xs text-slate-400">
                          {latestMessage
                            ? formatDateTime(latestMessage.created_at)
                            : formatDateTime(booking.updated_at || booking.created_at)}
                        </p>
                      </Link>
                    </div>

                    <div className="flex shrink-0 gap-3">
                      <Link
                        href={`/messages/${booking.id}`}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Open
                      </Link>

                      <DeleteChatButton bookingId={booking.id} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}