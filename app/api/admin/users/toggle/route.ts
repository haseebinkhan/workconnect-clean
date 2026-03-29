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
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile, error: adminError } = await supabase
      .from("profiles")
      .select("is_admin, role, is_active")
      .eq("id", user.id)
      .single();

    if (adminError || !adminProfile) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const isAdmin =
      adminProfile.is_active === true &&
      (adminProfile.is_admin === true || adminProfile.role === "admin");

    if (!isAdmin) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
    const isActive =
      typeof body?.isActive === "boolean" ? body.isActive : null;

    if (!userId || isActive === null) {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    if (userId === user.id && isActive === false) {
      return NextResponse.json(
        { message: "You cannot deactivate your own account" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "User updated successfully" });
  } catch (error) {
    console.error("toggle user error:", error);
    return NextResponse.json(
      { message: "Could not update user" },
      { status: 500 }
    );
  }
}