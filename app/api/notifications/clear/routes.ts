import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const userId = body?.userId as string;

    if (!userId || userId !== user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Notifications cleared." });
  } catch (error) {
    console.error("clear notifications error:", error);
    return NextResponse.json(
      { message: "Could not clear notifications." },
      { status: 500 }
    );
  }
}