import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const serverSupabase = await createServerClient();

    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile } = await serverSupabase
      .from("profiles")
      .select("is_admin, role")
      .eq("id", user.id)
      .single();

    const isAdmin =
      !!adminProfile &&
      (adminProfile.is_admin === true || adminProfile.role === "admin");

    if (!isAdmin) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const userIds = Array.isArray(body?.userIds) ? body.userIds : [];

    if (!userIds.length) {
      return NextResponse.json(
        { message: "No users selected" },
        { status: 400 }
      );
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    for (const userId of userIds) {
      await adminSupabase.from("worker_profiles").delete().eq("user_id", userId);
      await adminSupabase.from("hirer_profiles").delete().eq("user_id", userId);
      await adminSupabase.from("profiles").delete().eq("id", userId);

      const { error } = await adminSupabase.auth.admin.deleteUser(userId);

      if (error && !error.message.toLowerCase().includes("not found")) {
        return NextResponse.json(
          { message: `Failed to delete user: ${error.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("delete user error:", error);
    return NextResponse.json(
      { message: "Could not delete user" },
      { status: 500 }
    );
  }
}
