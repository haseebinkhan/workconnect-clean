import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

import { enqueueEmail } from "@/lib/email/queue";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function applicationReceivedEmail({
  hirerName,
  applicantName,
  jobTitle,
  coverMessage,
}: {
  hirerName: string;
  applicantName: string;
  jobTitle: string;
  coverMessage: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; background:#f8fafc; padding:24px;">
      <div style="max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">
        <div style="padding:24px;">
          <h2 style="margin:0 0 16px; color:#0f172a;">New job application received</h2>
          <p style="color:#334155;">Hi ${hirerName},</p>
          <p style="color:#334155;">
            <strong>${applicantName}</strong> has applied for <strong>${jobTitle}</strong>.
          </p>
          <p style="color:#334155;"><strong>Cover message:</strong></p>
          <p style="color:#334155;">${coverMessage || "No cover message provided."}</p>
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

    const jobId = normalizeText(body?.jobId);
    const coverMessage = normalizeText(body?.coverMessage);

    if (!jobId) {
      return NextResponse.json(
        { error: "Missing jobId." },
        { status: 400 }
      );
    }

    const { data: workerProfile, error: workerProfileError } = await adminSupabase
      .from("profiles")
      .select("id, full_name, email, worker_enabled, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (workerProfileError || !workerProfile) {
      return NextResponse.json(
        { error: "Worker profile not found." },
        { status: 404 }
      );
    }

    if (!workerProfile.is_active || !workerProfile.worker_enabled) {
      return NextResponse.json(
        { error: "Your worker profile is not active." },
        { status: 403 }
      );
    }

    const { data: job, error: jobError } = await adminSupabase
      .from("jobs")
      .select(
        `
        id,
        title,
        status,
        visibility,
        hirer_id,
        deleted_at
      `
      )
      .eq("id", jobId)
      .maybeSingle();

    if (jobError || !job || job.deleted_at) {
      return NextResponse.json(
        { error: "Job not found." },
        { status: 404 }
      );
    }

    if (job.status !== "open" || job.visibility !== "public") {
      return NextResponse.json(
        { error: "This job is not currently open for applications." },
        { status: 400 }
      );
    }

    const { data: existingApplication } = await adminSupabase
      .from("applications")
      .select("id, status")
      .eq("job_id", job.id)
      .eq("worker_user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (existingApplication?.id) {
      return NextResponse.json(
        {
          error: "You have already applied for this job.",
          applicationId: existingApplication.id,
        },
        { status: 409 }
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

    const { data: hirerAccount, error: hirerAccountError } = await adminSupabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", hirerProfile.user_id)
      .maybeSingle();

    if (hirerAccountError || !hirerAccount) {
      return NextResponse.json(
        { error: "Hirer account not found." },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    const { data: application, error: applicationError } = await adminSupabase
      .from("applications")
      .insert({
        job_id: job.id,
        worker_user_id: user.id,
        status: "pending",
        cover_message: coverMessage || null,
        seen_by_hirer: false,
        seen_by_worker: true,
        created_at: now,
      })
      .select("id, status")
      .single();

    if (applicationError || !application) {
      return NextResponse.json(
        { error: applicationError?.message || "Could not submit application." },
        { status: 400 }
      );
    }

    await adminSupabase.from("notifications").insert([
      {
        user_id: hirerAccount.id,
        type: "job_application_received",
        title: "New application received",
        body: `${workerProfile.full_name || "A worker"} applied for "${job.title || "Untitled job"}".`,
        meta: {
          application_id: application.id,
          job_id: job.id,
          job_title: job.title || "Untitled job",
          applicant_user_id: user.id,
          created_at: now,
        },
      },
      {
        user_id: user.id,
        type: "job_application_sent",
        title: "Application sent",
        body: `Your application for "${job.title || "Untitled job"}" was submitted.`,
        meta: {
          application_id: application.id,
          job_id: job.id,
          job_title: job.title || "Untitled job",
          hirer_user_id: hirerAccount.id,
          created_at: now,
        },
      },
    ]);

    if (coverMessage) {
      await adminSupabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: hirerAccount.id,
        content: `Job application message for "${job.title || "Untitled job"}":\n\n${coverMessage}`,
        is_read: false,
        delivered: false,
      });
    }

    if (hirerAccount.email) {
      await enqueueEmail({
        userId: hirerAccount.id,
        toEmail: hirerAccount.email,
        subject: "New job application received",
        html: applicationReceivedEmail({
          hirerName:
            hirerAccount.full_name ||
            hirerProfile.company_name ||
            hirerProfile.contact_name ||
            "there",
          applicantName: workerProfile.full_name || "A worker",
          jobTitle: job.title || "Untitled job",
          coverMessage,
        }),
      });
    }

    return NextResponse.json({
      success: true,
      applicationId: application.id,
      status: application.status,
      message: "Application submitted successfully.",
    });
  } catch (error) {
    console.error("jobs/apply error:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}