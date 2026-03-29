import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { adminUserId, targetUserId, badges } = await req.json();

    const { data: admin } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", adminUserId)
      .single();

    if (!admin?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        is_verified: true,
        verification_badges: badges || [],
      })
      .eq("id", targetUserId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

