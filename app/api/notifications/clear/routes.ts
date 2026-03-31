import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { error } = await adminSupabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      console.error("clear notifications delete error:", error);
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Notifications cleared.",
    });
  } catch (error) {
    console.error("clear notifications error:", error);
    return NextResponse.json(
      { message: "Could not clear notifications." },
      { status: 500 }
    );
  }
}