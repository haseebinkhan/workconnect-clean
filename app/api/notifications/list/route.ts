import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  href: string;
  createdAt: string;
};

function buildHref(item: any) {
  const meta = item.meta || {};

  if (meta.booking_id) return `/messages/${meta.booking_id}`;
  if (meta.job_id && meta.application_id) {
    return `/my-job-posts?job=${meta.job_id}&application=${meta.application_id}`;
  }
  if (meta.job_id) return `/my-job-posts?job=${meta.job_id}`;

  return "/notifications";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = body as { userId?: string };

    if (!userId) {
      return NextResponse.json({ items: [], total: 0 });
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const items: NotificationItem[] = (data || []).map((item) => ({
      id: item.id,
      type: item.type || "system",
      title: item.title || "Notification",
      subtitle: item.body || "",
      href: buildHref(item),
      createdAt: item.created_at,
    }));

    return NextResponse.json({
      items,
      total: items.length,
    });
  } catch (error) {
    console.error("notifications list error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}