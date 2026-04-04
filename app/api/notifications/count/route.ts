import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = body as { userId?: string };

    if (!userId) {
      return NextResponse.json({
        unreadMessages: 0,
        pendingRequests: 0,
        newApplications: 0,
        total: 0,
      });
    }

    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      unreadMessages: count || 0,
      pendingRequests: 0,
      newApplications: 0,
      total: count || 0,
    });
  } catch (error) {
    console.error("notifications count error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}