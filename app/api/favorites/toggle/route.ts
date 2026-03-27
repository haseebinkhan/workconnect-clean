import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const workerUserId =
      typeof body?.workerUserId === "string" ? body.workerUserId.trim() : "";

    if (!workerUserId) {
      return NextResponse.json(
        { error: "workerUserId is required." },
        { status: 400 }
      );
    }

    if (workerUserId === user.id) {
      return NextResponse.json(
        { error: "You cannot save yourself." },
        { status: 400 }
      );
    }

    const { data: targetUser, error: targetError } = await adminSupabase
      .from("profiles")
      .select("id, worker_enabled, is_active")
      .eq("id", workerUserId)
      .maybeSingle();

    if (targetError || !targetUser) {
      return NextResponse.json({ error: "Worker not found." }, { status: 404 });
    }

    if (!targetUser.is_active || !targetUser.worker_enabled) {
      return NextResponse.json(
        { error: "This user is not available as a worker." },
        { status: 400 }
      );
    }

    const { data: existing } = await adminSupabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("worker_user_id", workerUserId)
      .maybeSingle();

    if (existing?.id) {
      const { error: deleteError } = await adminSupabase
        .from("favorites")
        .delete()
        .eq("id", existing.id);

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        saved: false,
        message: "Worker removed from saved list.",
      });
    }

    const { error: insertError } = await adminSupabase
      .from("favorites")
      .insert({
        user_id: user.id,
        worker_user_id: workerUserId,
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      saved: true,
      message: "Worker saved successfully.",
    });
  } catch (error) {
    console.error("favorites/toggle error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}