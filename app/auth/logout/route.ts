import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  await supabase.auth.signOut();

  const url = new URL("/auth/login", request.url);
  return NextResponse.redirect(url, { status: 303 });
}
