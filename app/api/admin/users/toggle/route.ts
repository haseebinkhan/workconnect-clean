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

    const { data: adminProfile } = await supabase
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
    const userId = body?.userId as string;
    const isActive = body?.isActive as boolean;

    if (!userId || typeof isActive !== "boolean") {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    const { error } = await supabase
      .from("profiles")
      .update({ is_active: isActive })
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