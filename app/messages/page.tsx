import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function formatDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-GB", {
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
  return `${text.slice(0, max).trim()}…`;
}

function statusClasses(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "accepted":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "cancelled":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "in_progress":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "worker_marked_done":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "completed":
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

function formatLocation({
  country,
  region,
  city,
  postcode,
  areaSlug,
}: {
  country?: string | null;
  region?: string | null;
  city?: string | null;
  postcode?: string | null;
  areaSlug?: string | null;
}) {
  const parts = [city, region, country].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  if (postcode) return postcode;
  if (areaSlug) return areaSlug;
  return "Not specified";
}

function initials(name?: string | null) {
  const text = (name || "U").trim();
  return text
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export default async function MessagesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: conversations, error } = await supabase
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
    .or(`hirer_user_id.eq.${user.id},worker_user_id.eq.${user.id}`)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-6xl">
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

  const otherUserIds = [
    ...new Set(
      (conversations || []).map((item) =>
        item.hirer_user_id === user.id ? item.worker_user_id : item.hirer_user_id
      )
    ),
  ].filter(Boolean);

  const { data: otherProfiles } = otherUserIds.length
    ? await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          avatar_url,
          phone_number,
          whatsapp_number
        `)
        .in("id", otherUserIds)
    : { data: [] };

  const profileMap = new Map((otherProfiles || []).map((item) => [item.id, item]));

  const messageIds = (conversations || []).map((item) => item.id);

  const { data: recentMessages } = messageIds.length
    ? await supabase
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
        .in("booking_id", messageIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const latestMessageMap = new Map<string, any>();
  for (const item of recentMessages || []) {
    if (!latestMessageMap.has(item.booking_id)) {
      latestMessageMap.set(item.booking_id, item);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">Inbox</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Messages
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Continue request and booking conversations with workers and hirers.
          </p>
        </div>

        {!conversations || conversations.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">No conversations yet</h2>
            <p className="mt-2 text-sm text-slate-600">
              Your requests and booking conversations will appear here.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/workers"
                className="inline-flex rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Browse workers
              </Link>
              <Link
                href="/jobs"
                className="inline-flex rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
              >
                Browse jobs
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {conversations.map((conversation) => {
              const otherUserId =
                conversation.hirer_user_id === user.id
                  ? conversation.worker_user_id
                  : conversation.hirer_user_id;

              const otherProfile = profileMap.get(otherUserId);
              const latestMessage = latestMessageMap.get(conversation.id);

              const unread =
                conversation.hirer_user_id === user.id
                  ? !conversation.seen_by_hirer
                  : !conversation.seen_by_worker;

              const locationText = formatLocation({
                country: conversation.country,
                region: conversation.region,
                city: conversation.city,
                postcode: conversation.postcode,
                areaSlug: conversation.area_slug,
              });

              const previewText =
                latestMessage?.content ||
                conversation.message ||
                "Open the conversation to view details.";

              return (
                <Link
                  key={conversation.id}
                  href={`/messages/${conversation.id}`}
                  className="block rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 flex-1 gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-base font-bold text-indigo-700">
                        {otherProfile?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={otherProfile.avatar_url}
                            alt={otherProfile?.full_name || "User"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          initials(otherProfile?.full_name)
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="truncate text-xl font-bold text-slate-900">
                            {conversation.title || "Conversation"}
                          </h2>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusClasses(
                              conversation.status
                            )}`}
                          >
                            {conversation.status || "pending"}
                          </span>

                          {unread ? (
                            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-700">
                              New
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-2 text-sm font-medium text-slate-700">
                          {otherProfile?.full_name || "Other participant"}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {locationText}
                        </p>

                        <p className="mt-3 text-sm leading-7 text-slate-600">
                          {compactText(previewText, 160)}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 lg:w-[320px] lg:grid-cols-1">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Meeting time
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {conversation.preferred_meeting_at
                            ? formatDateTime(conversation.preferred_meeting_at)
                            : "Not specified"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Budget
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {conversation.budget_amount != null
                            ? `${conversation.currency_code || "GBP"} ${conversation.budget_amount}`
                            : "Not specified"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Updated
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {formatDateTime(
                            latestMessage?.created_at ||
                              conversation.updated_at ||
                              conversation.created_at
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
