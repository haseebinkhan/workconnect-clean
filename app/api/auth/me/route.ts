import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    return NextResponse.json({
      userId: user?.id || null,
    });
  } catch (error) {
    console.error("auth me error:", error);
    return NextResponse.json({ userId: null }, { status: 200 });
  }
}
