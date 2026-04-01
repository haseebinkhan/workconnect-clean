import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { enqueueEmail } from "@/lib/email/queue";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALLOWED_STATUSES = ["accepted", "rejected", "cancelled"] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isAllowedStatus(value: string): value is AllowedStatus {
  return ALLOWED_STATUSES.includes(value as AllowedStatus);
}

function applicationAcceptedEmail({
  workerName,
  jobTitle,
}: {
  workerName: string;
  jobTitle: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; background:#f8fafc; padding:24px;">
      <div style="max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">
        <div style="padding:24px;">
          <h2 style="margin:0 0 16px; color:#0f172a;">Application accepted</h2>
          <p style="color:#334155;">Hi ${workerName},</p>
          <p style="color:#334155;">
            Your application for <strong>${jobTitle}</strong> has been accepted.
          </p>
          <p style="margin-top:24px; color:#64748b; font-size:13px;">WorkConnect</p>
        </div>
      </div>
    </div>
  `;
}

function applicationRejectedEmail({
  workerName,
  jobTitle,
  reason,
}: {
  workerName: string;
  jobTitle: string;
  reason: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; background:#f8fafc; padding:24px;">
      <div style="max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">
        <div style="padding:24px;">
          <h2 style="margin:0 0 16px; color:#0f172a;">Application update</h2>
          <p style="color:#334155;">Hi ${workerName},</p>
          <p style="color:#334155;">
            Your application for <strong>${jobTitle}</strong> was not accepted.
          </p>
          <p style="color:#334155;"><strong>Reason:</strong> ${reason}</p>
          <p style="margin-top:24px; color:#64748b; font-size:13px;">WorkConnect</p>
        </div>
      </div>
    </div>
  `;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const applicationId = normalizeText(body?.applicationId);
    const status = normalizeText(body?.status).toLowerCase();
    const reason = normalizeText(body?.reason);

    if (!applicationId || !status) {
      return NextResponse.json(
        { error: "Missing applicationId or status." },
        { status: 400 }
      );
    }

    if (!isAllowedStatus(status)) {
      return NextResponse.json(
        { error: "Invalid application status." },
        { status: 400 }
      );
    }

    const { data: application, error: applicationError } = await adminSupabase
      .from("job_applications")
      .select(
        `
        id,
        job_id,
        worker_id,
        status,
        cover_message,
        proposed_rate,
        start_date,
        seen_by_hirer,
        seen_by_worker
      `
      )
      .eq("id", applicationId)
      .maybeSingle();

    if (applicationError || !application) {
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404 }
      );
    }

    const { data: job, error: jobError } = await adminSupabase
      .from("jobs")
      .select("id, title, hirer_id")
      .eq("id", application.job_id)
      .maybeSingle();

    if (jobError || !job) {
      return NextResponse.json(
        { error: "Job not found." },
        { status: 404 }
      );
    }

    const { data: hirerProfile, error: hirerProfileError } = await adminSupabase
      .from("hirer_profiles")
      .select("id, user_id, company_name, contact_name")
      .eq("id", job.hirer_id)
      .maybeSingle();

    if (hirerProfileError || !hirerProfile?.user_id) {
      return NextResponse.json(
        { error: "Hirer profile not found." },
        { status: 404 }
      );
    }

    if (hirerProfile.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { data: workerProfile, error: workerProfileError } = await adminSupabase
      .from("worker_profiles")
      .select("id, user_id")
      .eq("id", application.worker_id)
      .maybeSingle();

    if (workerProfileError || !workerProfile?.user_id) {
      return NextResponse.json(
        { error: "Worker profile not found." },
        { status: 404 }
      );
    }

    const { data: workerAccount } = await adminSupabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", workerProfile.user_id)
      .maybeSingle();

    const now = new Date().toISOString();

    const { error: updateError } = await adminSupabase
      .from("job_applications")
      .update({
        status,
        seen_by_hirer: true,
        seen_by_worker: false,
        updated_at: now,
      })
      .eq("id", application.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Could not update application." },
        { status: 400 }
      );
    }

    await adminSupabase.from("notifications").insert([
      {
        user_id: workerProfile.user_id,
        type: "job_application_status_updated",
        title:
          status === "accepted"
            ? "Application accepted"
            : status === "rejected"
            ? "Application rejected"
            : "Application cancelled",
        body:
          status === "accepted"
            ? `Your application for "${job.title || "Untitled job"}" was accepted.`
            : status === "rejected"
            ? `Your application for "${job.title || "Untitled job"}" was rejected.`
            : `Your application for "${job.title || "Untitled job"}" was cancelled.`,
        meta: {
          application_id: application.id,
          job_id: job.id,
          status,
          reason: reason || null,
          created_at: now,
        },
      },
      {
        user_id: hirerProfile.user_id,
        type: "job_application_status_updated",
        title:
          status === "accepted"
            ? "Application accepted"
            : status === "rejected"
            ? "Application rejected"
            : "Application cancelled",
        body: `You updated the application for "${job.title || "Untitled job"}".`,
        meta: {
          application_id: application.id,
          job_id: job.id,
          status,
          reason: reason || null,
          created_at: now,
        },
      },
    ]);

    if (workerAccount?.email) {
      if (status === "accepted") {
        await enqueueEmail({
          userId: workerAccount.id,
          toEmail: workerAccount.email,
          subject: `Application accepted for ${job.title || "your application"}`,
          html: applicationAcceptedEmail({
            workerName: workerAccount.full_name || "there",
            jobTitle: job.title || "Untitled job",
          }),
        });
      }

      if (status === "rejected" || status === "cancelled") {
        await enqueueEmail({
          userId: workerAccount.id,
          toEmail: workerAccount.email,
          subject:
            status === "rejected"
              ? `Application rejected for ${job.title || "your application"}`
              : `Application cancelled for ${job.title || "your application"}`,
          html: applicationRejectedEmail({
            workerName: workerAccount.full_name || "there",
            jobTitle: job.title || "Untitled job",
            reason:
              reason ||
              (status === "rejected"
                ? "The hirer did not move forward with this application."
                : "This application was cancelled."),
          }),
        });
      }
    }

    return NextResponse.json({
      success: true,
      applicationId: application.id,
      status,
      message: "Application status updated successfully.",
    });
  } catch (error) {
    console.error("jobs/update-status error:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}