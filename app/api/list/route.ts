import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type NotificationItem = {
  id: string;
  type: "message" | "application";
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

    const { data: unreadMessages, error: messagesError } = await supabase
      .from("messages")
      .select("id, booking_id, sender_id, content, created_at, receiver_id, is_read")
      .eq("receiver_id", userId)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(10);

    if (messagesError) {
      console.error("Unread messages error:", messagesError);
    }

    if (unreadMessages?.length) {
      const senderIds = [...new Set(unreadMessages.map((m) => m.sender_id))];

      let senderNames: Record<string, string> = {};
      if (senderIds.length > 0) {
        const { data: senders, error: sendersError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", senderIds);

        if (sendersError) {
          console.error("Sender profiles error:", sendersError);
        }

        senderNames =
          (senders || []).reduce((acc, row) => {
            acc[row.id] = row.full_name || "User";
            return acc;
          }, {} as Record<string, string>);
      }

      for (const msg of unreadMessages) {
        items.push({
          id: `message-${msg.id}`,
          type: "message",
          title: `New message from ${senderNames[msg.sender_id] || "User"}`,
          subtitle: msg.content || "Open chat",
          href: `/messages/${msg.booking_id}`,
          createdAt: msg.created_at || new Date().toISOString(),
        });
      }
    }

    const { data: hirerProfile, error: hirerProfileError } = await supabase
      .from("hirer_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (hirerProfileError) {
      console.error("Hirer profile error:", hirerProfileError);
    }

    if (hirerProfile?.id) {
      const { data: myJobs, error: jobsError } = await supabase
        .from("jobs")
        .select("id, title")
        .eq("hirer_id", hirerProfile.id);

      if (jobsError) {
        console.error("My jobs error:", jobsError);
      }

      const jobIds = (myJobs || []).map((j) => j.id);
      const jobTitles =
        (myJobs || []).reduce((acc, row) => {
          acc[row.id] = row.title || "Job";
          return acc;
        }, {} as Record<string, string>);

      if (jobIds.length > 0) {
        const { data: apps, error: appsError } = await supabase
          .from("job_applications")
          .select("id, job_id, created_at, status, seen_by_hirer")
          .in("job_id", jobIds)
          .eq("seen_by_hirer", false)
          .order("created_at", { ascending: false })
          .limit(10);

        if (appsError) {
          console.error("Job applications error:", appsError);
        }

        for (const app of apps || []) {
          items.push({
            id: `application-${app.id}`,
            type: "application",
            title: `New application for ${jobTitles[app.job_id] || "Job"}`,
            subtitle: `Status: ${app.status || "pending"}`,
            href: "/my-job-posts",
            createdAt: app.created_at || new Date().toISOString(),
          });
        }
      }
    }

    items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      items: items.slice(0, 12),
      total: items.length,
    });
  } catch (error) {
    console.error("Notification list fatal error:", error);
    return NextResponse.json(
      {
        items: [],
        total: 0,
        error: "failed",
      },
      { status: 200 }
    );
  }
}
