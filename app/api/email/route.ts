import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 25;

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

    if (!bearerOk && !cronHeader) {
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

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        sent: 0,
        failed: 0,
        message: "No pending emails.",
      });
    }

    const ids = jobs.map((job) => job.id);

    const { error: processingError } = await adminSupabase
      .from("email_jobs")
      .update({ status: "processing" })
      .in("id", ids)
      .eq("status", "pending");

    if (processingError) {
      return NextResponse.json(
        { success: false, message: processingError.message },
        { status: 500 }
      );
    }

    let sent = 0;
    let failed = 0;

    for (const job of jobs) {
      try {
        await sendEmail({
          to: job.to_email,
          subject: job.subject,
          html: job.html,
        });

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
          })
          .eq("id", job.id);

        failed += 1;
      }
    }

    return NextResponse.json({
      success: true,
      processed: jobs.length,
      sent,
      failed,
      message: "Email queue processed.",
    });
  } catch (error) {
    console.error("email process error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}