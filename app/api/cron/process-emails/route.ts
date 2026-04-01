import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
    // ✅ 1. allow Vercel cron
    const cronHeader = req.headers.get("x-vercel-cron");
    const isCron = Boolean(cronHeader);

    // ✅ 2. allow admin user (for button)
    let isAdminUser = false;

    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin, role")
          .eq("id", user.id)
          .single();

        if (profile?.is_admin || profile?.role === "admin") {
          isAdminUser = true;
        }
      }
    } catch {
      // ignore auth errors
    }

    // ❌ block others
    if (!isCron && !isAdminUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const nowIso = new Date().toISOString();

    const { data: jobs, error: fetchError } = await adminSupabase
      .from("email_jobs")
      .select("*")
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

    const jobIds = jobs.map((j) => j.id);

    await adminSupabase
      .from("email_jobs")
      .update({ status: "processing" })
      .in("id", jobIds)
      .eq("status", "pending");

    let sent = 0;
    let failed = 0;

    for (const job of jobs) {
      try {
        const result = await sendEmail({
          to: job.to_email,
          subject: job.subject,
          html: job.html,
        });

        if (!result.success) {
          const attempts = (job.attempts || 0) + 1;

          await adminSupabase
            .from("email_jobs")
            .update({
              status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
              attempts,
              error_message: result.error || "Send failed",
            })
            .eq("id", job.id);

          failed++;
          continue;
        }

        await adminSupabase
          .from("email_jobs")
          .update({
            status: "sent",
            processed_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        sent++;
      } catch (err) {
        const attempts = (job.attempts || 0) + 1;

        await adminSupabase
          .from("email_jobs")
          .update({
            status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
            attempts,
            error_message:
              err instanceof Error ? err.message : "Unknown error",
          })
          .eq("id", job.id);

        failed++;
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
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Server error",
      },
      { status: 500 }
    );
  }
}