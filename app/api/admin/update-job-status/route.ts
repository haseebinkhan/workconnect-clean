import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALLOWED_STATUSES = ["open", "paused", "rejected"] as const;

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile, error: adminError } = await adminSupabase
      .from("profiles")
      .select("id, is_admin, role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (adminError || !adminProfile) {
      return NextResponse.json({ error: "Admin profile not found" }, { status: 403 });
    }

    const isAdmin =
      adminProfile.is_active === true &&
      (adminProfile.is_admin === true || adminProfile.role === "admin");

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    const jobId = typeof body?.jobId === "string" ? body.jobId.trim() : "";
    const status = typeof body?.status === "string" ? body.status.trim() : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    if (!jobId || !status) {
      return NextResponse.json(
        { error: "Missing jobId or status" },
        { status: 400 }
      );
    }

    if (!ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) {
      return NextResponse.json(
        { error: "Invalid job status" },
        { status: 400 }
      );
    }

    if ((status === "paused" || status === "rejected") && reason.length < 5) {
      return NextResponse.json(
        { error: "A short reason is required for paused or rejected jobs." },
        { status: 400 }
      );
    }

    const { data: job, error: jobError } = await adminSupabase
      .from("jobs")
      .select("id, title, hirer_id, status, deleted_at")
      .eq("id", jobId)
      .maybeSingle();

    if (jobError || !job || job.deleted_at) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status === status) {
      return NextResponse.json({ success: true, message: "No change needed" });
    }

    const now = new Date().toISOString();

    const { error: updateError } = await adminSupabase
      .from("jobs")
      .update({
        status,
        updated_at: now,
      })
      .eq("id", jobId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    const { data: hirerProfile } = await adminSupabase
      .from("hirer_profiles")
      .select("id, user_id, company_name, contact_name")
      .eq("id", job.hirer_id)
      .maybeSingle();

    if (hirerProfile?.user_id) {
      const title =
        status === "open"
          ? "Job approved"
          : status === "paused"
          ? "Job paused"
          : "Job rejected";

      const bodyText =
        status === "open"
          ? `Your job "${job.title}" is now live.`
          : status === "paused"
          ? `Your job "${job.title}" has been paused by admin. Reason: ${reason}`
          : `Your job "${job.title}" was not approved. Reason: ${reason}`;

      await adminSupabase.from("notifications").insert({
        user_id: hirerProfile.user_id,
        type: "job_status_updated",
        title,
        body: bodyText,
        meta: {
          job_id: job.id,
          status,
          reviewed_by: user.id,
          review_reason: reason || null,
          reviewed_at: now,
        },
      });
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status,
      reason: reason || null,
    });
  } catch (error) {
    console.error("admin update job status error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
