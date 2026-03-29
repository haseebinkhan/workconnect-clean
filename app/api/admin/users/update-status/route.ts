import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = createServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile, error: adminError } = await supabase
      .from("profiles")
      .select("is_admin, role, is_active")
      .eq("id", user.id)
      .single();

    if (adminError || !adminProfile) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isAdmin =
      adminProfile.is_active === true &&
      (adminProfile.is_admin === true || adminProfile.role === "admin");

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const targetUserId =
      typeof body?.targetUserId === "string" ? body.targetUserId.trim() : "";
    const isActive =
      typeof body?.isActive === "boolean" ? body.isActive : null;

    if (!targetUserId || isActive === null) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (targetUserId === user.id && isActive === false) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
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