import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const isPublic = body?.isPublic;

    if (typeof isPublic !== "boolean") {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    const { error } = await supabase
      .from("worker_profiles")
      .update({ is_public: isPublic })
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: isPublic
        ? "Worker profile is now public."
        : "Worker profile is now hidden.",
    });
  } catch (error) {
    console.error("worker visibility error:", error);
    return NextResponse.json(
      { message: "Could not update worker visibility." },
      { status: 500 }
    );
  }
}

