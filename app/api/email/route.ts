import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TAKE_LIMIT = 200;
const SEND_CHUNK = 50;

type EmailJobRow = {
  id: string;
  kind: string;
  to_email: string;
  subject: string;
  html: string;
  meta: Record<string, unknown> | null;
  status: "pending" | "processing" | "sent" | "failed";
  attempts: number;
};

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function groupKey(job: EmailJobRow) {
  return JSON.stringify({
    kind: job.kind,
    subject: job.subject,
    html: job.html,
  });
}

export async function GET(req: Request) {
  return handleQueue(req);
}

export async function POST(req: Request) {
  return handleQueue(req);
}

async function handleQueue(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const expected = process.env.EMAIL_QUEUE_SECRET;

    if (expected && authHeader !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: pendingRows, error: selectError } = await adminSupabase
      .from("email_jobs")
      .select("id, kind, to_email, subject, html, meta, status, attempts")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(TAKE_LIMIT);

    if (selectError) {
      return NextResponse.json({ error: selectError.message }, { status: 500 });
    }

    const jobs = (pendingRows || []) as EmailJobRow[];

    if (jobs.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: "No pending email jobs.",
      });
    }

    const jobIds = jobs.map((job) => job.id);

    const { error: markProcessingError } = await adminSupabase
      .from("email_jobs")
      .update({
        status: "processing",
        locked_at: new Date().toISOString(),
      })
      .in("id", jobIds)
      .eq("status", "pending");

    if (markProcessingError) {
      return NextResponse.json(
        { error: markProcessingError.message },
        { status: 500 }
      );
    }

    const grouped = new Map<string, EmailJobRow[]>();

    for (const job of jobs) {
      const key = groupKey(job);
      const existing = grouped.get(key) || [];
      existing.push(job);
      grouped.set(key, existing);
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const [, group] of grouped) {
      const recipients = Array.from(
        new Set(group.map((job) => job.to_email.trim().toLowerCase()))
      );

      for (const emailBatch of chunkArray(recipients, SEND_CHUNK)) {
        const batchJobIds = group
          .filter((job) => emailBatch.includes(job.to_email.trim().toLowerCase()))
          .map((job) => job.id);

        const result = await sendEmail({
          to: emailBatch,
          subject: group[0].subject,
          html: group[0].html,
        });

        if (result.success) {
          sentCount += batchJobIds.length;

          await adminSupabase
            .from("email_jobs")
            .update({
              status: "sent",
              processed_at: new Date().toISOString(),
              last_error: null,
            })
            .in("id", batchJobIds);
        } else {
          failedCount += batchJobIds.length;

          await adminSupabase
            .from("email_jobs")
            .update({
              status: "failed",
              attempts: 1,
              last_error: result.error || "Unknown error",
            })
            .in("id", batchJobIds);
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: jobs.length,
      sent: sentCount,
      failed: failedCount,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Server error",
      },
      { status: 500 }
    );
  }
}