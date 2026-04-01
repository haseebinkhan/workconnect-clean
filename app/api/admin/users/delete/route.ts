import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

type DeleteBody = {
  userIds: string[];
};

function json(message: string, status = 200) {
  return NextResponse.json({ message }, { status });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return json("Unauthorized.", 401);
    }

    const { data: me, error: meError } = await supabase
      .from("profiles")
      .select("id, is_admin, role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (meError) {
      return json(meError.message, 500);
    }

    const isAdmin =
      !!me &&
      me.is_active === true &&
      (me.is_admin === true || me.role === "admin");

    if (!isAdmin) {
      return json("Forbidden.", 403);
    }

    const body = (await request.json()) as DeleteBody;

    const userIds = Array.isArray(body?.userIds)
      ? body.userIds.filter((id) => typeof id === "string" && id.trim())
      : [];

    if (!userIds.length) {
      return json("No users selected.", 400);
    }

    if (userIds.includes(user.id)) {
      return json("You cannot delete your own admin account.", 400);
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    for (const userId of userIds) {
      const { data: targetProfile } = await adminSupabase
        .from("profiles")
        .select("id, is_admin, role")
        .eq("id", userId)
        .maybeSingle();

      if (targetProfile?.is_admin === true || targetProfile?.role === "admin") {
        return json("Cannot delete another admin.", 400);
      }

      await adminSupabase.from("worker_profiles").delete().eq("user_id", userId);
      await adminSupabase.from("hirer_profiles").delete().eq("user_id", userId);
      await adminSupabase.from("notifications").delete().eq("user_id", userId);
      await adminSupabase.from("profiles").delete().eq("id", userId);

      const { error } = await adminSupabase.auth.admin.deleteUser(userId);

      if (error && !error.message.toLowerCase().includes("not found")) {
        return json(`Failed to delete user: ${error.message}`, 500);
      }
    }

    return json("User deleted successfully.");
  } catch (error) {
    console.error("admin delete error:", error);
    return json("Could not delete user.", 500);
  }
}