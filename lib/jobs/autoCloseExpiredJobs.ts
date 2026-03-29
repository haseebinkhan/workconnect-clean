import { createClient } from "@supabase/supabase-js";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function autoCloseExpiredJobs() {
  try {
    const now = new Date().toISOString();

    const { error } = await adminSupabase
      .from("jobs")
      .update({ status: "closed" })
      .lt("expires_at", now)
      .eq("status", "open");

    if (error) {
      console.error("Auto close jobs error:", error.message);
    }
  } catch (err) {
    console.error("Auto close jobs crash:", err);
  }
}

