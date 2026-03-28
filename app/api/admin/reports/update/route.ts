import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function isAdmin(userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();

  return !!data?.is_admin;
}

export async function POST(req: Request) {
  try {
    const { adminUserId, reportId, status } = await req.json();

    if (!adminUserId || !reportId || !status) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    if (!(await isAdmin(adminUserId))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const update: any = { status };

    if (status === "resolved") {
      update.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("reports")
      .update(update)
      .eq("id", reportId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
