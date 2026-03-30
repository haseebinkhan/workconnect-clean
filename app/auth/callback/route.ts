import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const type = requestUrl.searchParams.get("type");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  let redirectTo = "/dashboard";

  if (type === "recovery") {
    redirectTo = "/auth/update-password";
  }

  return NextResponse.redirect(`${requestUrl.origin}${redirectTo}`);
}