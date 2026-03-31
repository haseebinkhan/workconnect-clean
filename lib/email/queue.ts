import { createClient as createAdminClient } from "@supabase/supabase-js";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type EnqueueEmailInput = {
  userId?: string | null;
  toEmail: string;
  subject: string;
  html: string;
  emailType?: string | null;
  meta?: Record<string, any> | null;
  scheduledFor?: string | null;
};

export async function enqueueEmails({
  userId = null,
  toEmail,
  subject,
  html,
  emailType = null,
  meta = {},
  scheduledFor = null,
}: EnqueueEmailInput) {
  const cleanEmail = toEmail.trim().toLowerCase();
  const cleanSubject = subject.trim();
  const cleanHtml = html.trim();

  if (!cleanEmail || !cleanSubject || !cleanHtml) {
    throw new Error("Missing required email queue fields.");
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

type BulkEmailJob = {
  userId?: string | null;
  toEmail: string;
  subject: string;
  html: string;
  emailType?: string | null;
  meta?: Record<string, any> | null;
  scheduledFor?: string | null;
};

export async function enqueueEmailsBulk(items: BulkEmailJob[]) {
  if (!items.length) {
    return [];
  }

  const rows = items
    .map((item) => {
      const toEmail = item.toEmail?.trim().toLowerCase() || "";
      const subject = item.subject?.trim() || "";
      const html = item.html?.trim() || "";

      if (!toEmail || !subject || !html) {
        return null;
      }

      return {
        user_id: item.userId || null,
        to_email: toEmail,
        subject,
        html,
        email_type: item.emailType || null,
        meta: item.meta || {},
        scheduled_for: item.scheduledFor || null,
        status: "pending",
      };
    })
    .filter(Boolean);

  if (!rows.length) {
    return [];
  }

  const { data, error } = await adminSupabase
    .from("email_jobs")
    .insert(rows)
    .select("id");

  if (error) {
    console.error("enqueueEmailsBulk error:", error);
    throw new Error(error.message || "Could not queue bulk emails.");
  }

  return data || [];
}