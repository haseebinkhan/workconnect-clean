import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 25;

type EmailJob = {
  id: string;
  user_id: string | null;
  to_email: string;
  subject: string;
  html: string;
  email_type: string | null;
  meta: Record<string, unknown> | null;
  status: string;
  attempts: number | null;
  scheduled_for: string | null;
  created_at: string;
};

export async function GET(req: Request) {
  return handleProcess(req);
}

export async function POST(req: Request) {
  return handleProcess(req);
}

async function handleProcess(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const bearerOk =
      authHeader === `Bearer ${process.env.EMAIL_QUEUE_SECRET}`;

    const cronHeader = req.headers.get("x-vercel-cron");
    const cronOk = Boolean(cronHeader);

    if (!bearerOk && !cronOk) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const nowIso = new Date().toISOString();

    const { data: jobs, error: fetchError } = await adminSupabase
      .from("email_jobs")
      .select(
        "id, user_id, to_email, subject, html, email_type, meta, status, attempts, scheduled_for, created_at"
      )
      .eq("status", "pending")
      .or(`scheduled_for.is.null,scheduled_for.lte.${nowIso}`)
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      return NextResponse.json(
        { success: false, message: fetchError.message },
        { status: 500 }
      );
    }

    const pendingJobs = (jobs || []) as EmailJob[];

    if (pendingJobs.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        sent: 0,
        failed: 0,
        message: "No pending emails.",
      });
    }

    const jobIds = pendingJobs.map((job) => job.id);

    const { error: processingError } = await adminSupabase
      .from("email_jobs")
      .update({
        status: "processing",
        processed_at: null,
        error_message: null,
      })
      .in("id", jobIds)
      .eq("status", "pending");

    if (processingError) {
      return NextResponse.json(
        { success: false, message: processingError.message },
        { status: 500 }
      );
    }

    const { data: lockedJobs, error: lockedJobsError } = await adminSupabase
      .from("email_jobs")
      .select(
        "id, user_id, to_email, subject, html, email_type, meta, status, attempts, scheduled_for, created_at"
      )
      .in("id", jobIds)
      .eq("status", "processing")
      .order("created_at", { ascending: true });

    if (lockedJobsError) {
      return NextResponse.json(
        { success: false, message: lockedJobsError.message },
        { status: 500 }
      );
    }

    const jobsToProcess = (lockedJobs || []) as EmailJob[];

    let sent = 0;
    let failed = 0;

    for (const job of jobsToProcess) {
      try {
        const sendResult = await sendEmail({
          to: job.to_email,
          subject: job.subject,
          html: job.html,
        });

        if (!sendResult.success) {
          const attempts = (job.attempts || 0) + 1;
          const errorMessage = sendResult.error || "Unknown send error";

          await adminSupabase
            .from("email_jobs")
            .update({
              status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
              attempts,
              error_message: errorMessage,
              processed_at:
                attempts >= MAX_ATTEMPTS ? new Date().toISOString() : null,
            })
            .eq("id", job.id);

          failed += 1;
          continue;
        }

        const { error: sentUpdateError } = await adminSupabase
          .from("email_jobs")
          .update({
            status: "sent",
            processed_at: new Date().toISOString(),
            error_message: null,
          })
          .eq("id", job.id);

        if (sentUpdateError) {
          const attempts = (job.attempts || 0) + 1;

          await adminSupabase
            .from("email_jobs")
            .update({
              status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
              attempts,
              error_message: sentUpdateError.message,
              processed_at:
                attempts >= MAX_ATTEMPTS ? new Date().toISOString() : null,
            })
            .eq("id", job.id);

          failed += 1;
          continue;
        }

        sent += 1;
      } catch (error) {
        const attempts = (job.attempts || 0) + 1;
        const errorMessage =
          error instanceof Error ? error.message : "Unknown send error";

        await adminSupabase
          .from("email_jobs")
          .update({
            status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
            attempts,
            error_message: errorMessage,
            processed_at:
              attempts >= MAX_ATTEMPTS ? new Date().toISOString() : null,
          })
          .eq("id", job.id);

        failed += 1;
      }
    }

    return NextResponse.json({
      success: true,
      processed: jobsToProcess.length,
      sent,
      failed,
      message: "Email queue processed.",
    });
  } catch (error) {
    console.error("process-emails error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Server error",
      },
      { status: 500 }
    );
  }
}