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
    const body = await req.json();
    const { adminUserId, targetUserId, isActive } = body;

    if (!adminUserId || !targetUserId || typeof isActive !== "boolean") {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const adminOk = await isAdmin(adminUserId);
    if (!adminOk) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { error } = await supabase
      .from("profiles")
      .update({ is_active: isActive })
      .eq("id", targetUserId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}