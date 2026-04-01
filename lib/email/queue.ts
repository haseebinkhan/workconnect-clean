import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type EmailMeta = Record<string, unknown>;

type EnqueueEmailInput = {
  userId?: string | null;
  toEmail: string;
  subject: string;
  html: string;
  emailType?: string | null;
  meta?: EmailMeta | null;
  scheduledFor?: string | null;
};

type BulkEmailJob = {
  userId?: string | null;
  toEmail: string;
  subject: string;
  html: string;
  emailType?: string | null;
  meta?: EmailMeta | null;
  scheduledFor?: string | null;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeSubject(value: string) {
  return value.trim();
}

function normalizeHtml(value: string) {
  return value.trim();
}

async function findExistingPendingJob(params: {
  toEmail: string;
  subject: string;
  emailType?: string | null;
  scheduledFor?: string | null;
}) {
  let query = adminSupabase
    .from("email_jobs")
    .select("id")
    .eq("to_email", params.toEmail)
    .eq("subject", params.subject)
    .eq("status", "pending")
    .limit(1);

  if (params.emailType) {
    query = query.eq("email_type", params.emailType);
  } else {
    query = query.is("email_type", null);
  }

  if (params.scheduledFor) {
    query = query.eq("scheduled_for", params.scheduledFor);
  } else {
    query = query.is("scheduled_for", null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("findExistingPendingJob error:", error);
    return null;
  }

  return data;
}

export async function enqueueEmail({
  userId = null,
  toEmail,
  subject,
  html,
  emailType = null,
  meta = {},
  scheduledFor = null,
}: EnqueueEmailInput) {
  const cleanEmail = normalizeEmail(toEmail);
  const cleanSubject = normalizeSubject(subject);
  const cleanHtml = normalizeHtml(html);

  if (!cleanEmail || !cleanSubject || !cleanHtml) {
    throw new Error("Missing required email queue fields.");
  }

  const existing = await findExistingPendingJob({
    toEmail: cleanEmail,
    subject: cleanSubject,
    emailType,
    scheduledFor,
  });

  if (existing) {
    return existing;
  }

  if (!scheduledFor) {
    try {
      const instantResult = await sendEmail({
        to: cleanEmail,
        subject: cleanSubject,
        html: cleanHtml,
      });

      if (instantResult.success) {
        return {
          id: instantResult.id ?? null,
          instant: true,
        };
      }
    } catch (error) {
      console.error("Instant email failed, falling back to queue:", error);
    }
  }

  const { data, error } = await adminSupabase
    .from("email_jobs")
    .insert({
      user_id: userId,
      to_email: cleanEmail,
      subject: cleanSubject,
      html: cleanHtml,
      email_type: emailType,
      meta: meta || {},
      scheduled_for: scheduledFor,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error("enqueueEmail error:", error);
    throw new Error(error.message || "Could not queue email.");
  }

  return data;
}

export async function enqueueEmailsBulk(items: BulkEmailJob[]) {
  if (!items.length) {
    return [];
  }

  const normalizedItems = items
    .map((item) => {
      const cleanEmail = normalizeEmail(item.toEmail || "");
      const cleanSubject = normalizeSubject(item.subject || "");
      const cleanHtml = normalizeHtml(item.html || "");

      if (!cleanEmail || !cleanSubject || !cleanHtml) {
        return null;
      }

      return {
        user_id: item.userId || null,
        to_email: cleanEmail,
        subject: cleanSubject,
        html: cleanHtml,
        email_type: item.emailType || null,
        meta: item.meta || {},
        scheduled_for: item.scheduledFor || null,
        status: "pending" as const,
      };
    })
    .filter(
      (
        row
      ): row is {
        user_id: string | null;
        to_email: string;
        subject: string;
        html: string;
        email_type: string | null;
        meta: EmailMeta;
        scheduled_for: string | null;
        status: "pending";
      } => row !== null
    );

  if (!normalizedItems.length) {
    return [];
  }

  const uniqueMap = new Map<string, (typeof normalizedItems)[number]>();

  for (const row of normalizedItems) {
    const key = [
      row.to_email,
      row.subject,
      row.email_type || "",
      row.scheduled_for || "",
    ].join("::");

    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, row);
    }
  }

  const uniqueRows = Array.from(uniqueMap.values());
  const rowsToInsert: typeof uniqueRows = [];

  for (const row of uniqueRows) {
    const existing = await findExistingPendingJob({
      toEmail: row.to_email,
      subject: row.subject,
      emailType: row.email_type,
      scheduledFor: row.scheduled_for,
    });

    if (!existing) {
      rowsToInsert.push(row);
    }
  }

  if (!rowsToInsert.length) {
    return [];
  }

  const { data, error } = await adminSupabase
    .from("email_jobs")
    .insert(rowsToInsert)
    .select("id");

  if (error) {
    console.error("enqueueEmailsBulk error:", error);
    throw new Error(error.message || "Could not queue bulk emails.");
  }

  return data || [];
}