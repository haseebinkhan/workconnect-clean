import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type NotificationItem = {
  id: string;
  type: "message" | "application" | "request";
  title: string;
  subtitle: string;
  href: string;
  createdAt: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = body as { userId?: string };

    if (!userId) {
      return NextResponse.json({ items: [], total: 0 }, { status: 200 });
    }

    const items: NotificationItem[] = [];

    const { data: myBookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("id, title, hirer_user_id, worker_user_id, status, created_at")
      .or(`hirer_user_id.eq.${userId},worker_user_id.eq.${userId}`)
      .is("deleted_at", null);

    if (bookingsError) {
      return NextResponse.json(
        { error: bookingsError.message },
        { status: 400 }
      );
    }

    const bookingIds = (myBookings || []).map((b) => b.id);

    if (bookingIds.length > 0) {
      const { data: unreadMessages, error: unreadMessagesError } = await supabase
        .from("messages")
        .select("id, booking_id, sender_id, content, created_at, is_read")
        .in("booking_id", bookingIds)
        .neq("sender_id", userId)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(20);

      if (unreadMessagesError) {
        return NextResponse.json(
          { error: unreadMessagesError.message },
          { status: 400 }
        );
      }

      if (unreadMessages?.length) {
        const senderIds = [...new Set(unreadMessages.map((m) => m.sender_id))];

        let senderNameMap = new Map<string, string>();

        if (senderIds.length > 0) {
          const { data: senders, error: sendersError } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", senderIds);

          if (sendersError) {
            return NextResponse.json(
              { error: sendersError.message },
              { status: 400 }
            );
          }

          senderNameMap = new Map(
            (senders || []).map((sender) => [
              sender.id,
              sender.full_name || "User",
            ])
          );
        }

        for (const msg of unreadMessages) {
          const booking = (myBookings || []).find((b) => b.id === msg.booking_id);

          items.push({
            id: `message-${msg.id}`,
            type: "message",
            title: `New message from ${senderNameMap.get(msg.sender_id) || "User"}`,
            subtitle: msg.content || booking?.title || "Open conversation",
            href: `/messages/${msg.booking_id}`,
            createdAt: msg.created_at || new Date().toISOString(),
          });
        }
      }
    }

    const { data: pendingBookings, error: pendingBookingsError } = await supabase
      .from("bookings")
      .select("id, title, created_at")
      .eq("worker_user_id", userId)
      .eq("status", "pending")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20);

    if (pendingBookingsError) {
      return NextResponse.json(
        { error: pendingBookingsError.message },
        { status: 400 }
      );
    }

    for (const booking of pendingBookings || []) {
      items.push({
        id: `request-${booking.id}`,
        type: "request",
        title: "New booking request",
        subtitle: booking.title || "Open request",
        href: `/messages/${booking.id}`,
        createdAt: booking.created_at || new Date().toISOString(),
      });
    }

    const { data: hirerProfile, error: hirerProfileError } = await supabase
      .from("hirer_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (hirerProfileError) {
      return NextResponse.json(
        { error: hirerProfileError.message },
        { status: 400 }
      );
    }

    if (hirerProfile?.id) {
      const { data: myJobs, error: myJobsError } = await supabase
        .from("jobs")
        .select("id, title")
        .eq("hirer_id", hirerProfile.id)
        .is("deleted_at", null);

      if (myJobsError) {
        return NextResponse.json(
          { error: myJobsError.message },
          { status: 400 }
        );
      }

      const jobIds = (myJobs || []).map((job) => job.id);
      const jobTitleMap = new Map(
        (myJobs || []).map((job) => [job.id, job.title || "Job"])
      );

      if (jobIds.length > 0) {
        const { data: applications, error: applicationsError } = await supabase
          .from("job_applications")
          .select("id, job_id, worker_id, status, created_at, seen_by_hirer")
          .in("job_id", jobIds)
          .eq("seen_by_hirer", false)
          .order("created_at", { ascending: false })
          .limit(20);

        if (applicationsError) {
          return NextResponse.json(
            { error: applicationsError.message },
            { status: 400 }
          );
        }

        if (applications?.length) {
          const workerProfileIds = [
            ...new Set(applications.map((app) => app.worker_id).filter(Boolean)),
          ];

          let workerUserIdMap = new Map<string, string>();

          if (workerProfileIds.length > 0) {
            const { data: workerProfiles, error: workerProfilesError } = await supabase
              .from("worker_profiles")
              .select("id, user_id")
              .in("id", workerProfileIds);

            if (workerProfilesError) {
              return NextResponse.json(
                { error: workerProfilesError.message },
                { status: 400 }
              );
            }

            workerUserIdMap = new Map(
              (workerProfiles || []).map((row) => [row.id, row.user_id])
            );
          }

          for (const app of applications) {
            const workerUserId = workerUserIdMap.get(app.worker_id) || "";

            items.push({
              id: `application-${app.id}`,
              type: "application",
              title: `New application for ${jobTitleMap.get(app.job_id) || "Job"}`,
              subtitle: app.status ? `Status: ${app.status}` : "New applicant",
              href: workerUserId
                ? `/my-job-posts?job=${app.job_id}&application=${app.id}&workerUser=${workerUserId}`
                : `/my-job-posts?job=${app.job_id}&application=${app.id}`,
              createdAt: app.created_at || new Date().toISOString(),
            });
          }
        }
      }
    }

    items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      items: items.slice(0, 20),
      total: items.length,
    });
  } catch (error) {
    console.error("Notification list error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

