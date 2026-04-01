import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

type UpdateStatusBody = {
  targetUserId?: string;
  isActive?: boolean;
};

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: me, error: meError } = await adminSupabase
      .from("profiles")
      .select("id, is_admin, role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (meError) {
      return NextResponse.json({ error: meError.message }, { status: 500 });
    }

    const isAdmin =
      !!me &&
      me.is_active === true &&
      (me.is_admin === true || me.role === "admin");

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as UpdateStatusBody;

    const targetUserId =
      typeof body?.targetUserId === "string" ? body.targetUserId.trim() : "";
    const isActive =
      typeof body?.isActive === "boolean" ? body.isActive : null;

    if (!targetUserId || isActive === null) {
      return NextResponse.json(
        { error: "Missing targetUserId or isActive" },
        { status: 400 }
      );
    }

    if (targetUserId === user.id) {
      return NextResponse.json(
        { error: "You cannot change your own admin account status" },
        { status: 400 }
      );
    }

    const { data: targetProfile, error: targetError } = await adminSupabase
      .from("profiles")
      .select("id, is_admin, role")
      .eq("id", targetUserId)
      .maybeSingle();

    if (targetError) {
      return NextResponse.json({ error: targetError.message }, { status: 500 });
    }

    if (!targetProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetProfile.is_admin === true || targetProfile.role === "admin") {
      return NextResponse.json(
        { error: "Cannot change another admin" },
        { status: 400 }
      );
    }

    const { error: updateError } = await adminSupabase
      .from("profiles")
      .update({ is_active: isActive })
      .eq("id", targetUserId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("admin update-status error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}