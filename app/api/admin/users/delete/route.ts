import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const serverSupabase = await createServerClient();

    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data: me } = await serverSupabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!me?.is_admin) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { userIds } = await request.json();

    if (!userIds || userIds.length === 0) {
      return NextResponse.json({ message: "No users selected" }, { status: 400 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    for (const id of userIds) {
      await admin.from("profiles").delete().eq("id", id);
      await admin.from("worker_profiles").delete().eq("user_id", id);
      await admin.from("hirer_profiles").delete().eq("user_id", id);

      await admin.auth.admin.deleteUser(id);
    }

    return NextResponse.json({ message: "Users deleted successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Delete failed" }, { status: 500 });
  }
}