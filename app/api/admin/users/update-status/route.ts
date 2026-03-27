import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("is_admin, role")
      .eq("id", user.id)
      .single();

    const isAdmin =
      !!adminProfile &&
      (adminProfile.is_admin === true || adminProfile.role === "admin");

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const targetUserId = body?.targetUserId as string;
    const isActive = body?.isActive as boolean;

    if (!targetUserId || typeof isActive !== "boolean") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { error } = await supabase
      .from("profiles")
      .update({ is_active: isActive })
      .eq("id", targetUserId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("admin update user status error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}