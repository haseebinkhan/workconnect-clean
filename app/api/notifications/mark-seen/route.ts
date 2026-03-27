import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildAccess } from "@/lib/access";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, target } = body as {
      userId?: string;
      target?: "requests" | "applications";
    };

    if (!userId || !target) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, worker_enabled, hirer_enabled")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: profileError?.message || "Profile not found" },
        { status: 400 }
      );
    }

    const access = buildAccess(profile);

    if (target === "requests") {
      if (!access.canReceiveRequests) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { error } = await supabase
        .from("bookings")
        .update({ seen_by_worker: true })
        .eq("worker_user_id", userId)
        .eq("status", "pending")
        .eq("seen_by_worker", false)
        .is("deleted_at", null);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    if (target === "applications") {
      if (!access.canPostJobs) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { data: hirerProfile, error: hirerProfileError } = await supabase
        .from("hirer_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (hirerProfileError) {
        return NextResponse.json(
          { error: hirerProfileError.message },
          { status: 400 }
        );
      }

      if (!hirerProfile?.id) {
        return NextResponse.json({ success: true });
      }

      const { data: myJobs, error: myJobsError } = await supabase
        .from("jobs")
        .select("id")
        .eq("hirer_id", hirerProfile.id)
        .is("deleted_at", null);

      if (myJobsError) {
        return NextResponse.json(
          { error: myJobsError.message },
          { status: 400 }
        );
      }

      const jobIds = (myJobs || []).map((job) => job.id);

      if (jobIds.length === 0) {
        return NextResponse.json({ success: true });
      }

      const { error } = await supabase
        .from("job_applications")
        .update({ seen_by_hirer: true })
        .in("job_id", jobIds)
        .eq("seen_by_hirer", false);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  } catch (error) {
    console.error("Notification mark-seen error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
