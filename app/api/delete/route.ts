import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

type DeleteBody = {
  userIds: string[];
};

function json(message: string, status = 200) {
  return NextResponse.json({ message }, { status });
}

export async function POST(request: Request) {
  try {
    const serverSupabase = createServerClient();

    const {
      data: { user },
      error: userError,
    } = await serverSupabase.auth.getUser();

    if (userError || !user) {
      return json("Unauthorized.", 401);
    }

    const { data: me, error: meError } = await serverSupabase
      .from("profiles")
      .select("id, is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (meError || !me?.is_admin) {
      return json("Forbidden.", 403);
    }

    const body = (await request.json()) as DeleteBody;

    const userIds = Array.isArray(body?.userIds)
      ? body.userIds.filter((id) => typeof id === "string" && id.trim())
      : [];

    if (!userIds.length) {
      return json("No users selected.", 400);
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    for (const userId of userIds) {
      await adminSupabase.from("worker_profiles").delete().eq("user_id", userId);
      await adminSupabase.from("hirer_profiles").delete().eq("user_id", userId);
      await adminSupabase.from("profiles").delete().eq("id", userId);

      const { error } = await adminSupabase.auth.admin.deleteUser(userId);

      if (error && !error.message.toLowerCase().includes("not found")) {
        return json(`Failed to delete user: ${error.message}`, 500);
      }
    }

    return json("User deleted successfully.");
  } catch (error) {
    console.error("admin delete user error:", error);
    return json("Could not delete user.", 500);
  }
}