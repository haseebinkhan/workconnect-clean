import { createClient as createAdminClient } from "@supabase/supabase-js";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type EnqueueEmailInput = {
  kind: string;
  toEmail: string;
  subject: string;
  html: string;
  meta?: Record<string, unknown>;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function enqueueEmails(items: EnqueueEmailInput[]) {
  const rows = items
    .map((item) => ({
      kind: item.kind,
      to_email: normalizeEmail(item.toEmail),
      subject: item.subject,
      html: item.html,
      meta: item.meta ?? {},
      status: "pending" as const,
    }))
    .filter((item) => item.to_email.length > 3);

  if (rows.length === 0) return;

  const { error } = await adminSupabase.from("email_jobs").insert(rows);

  if (error) {
    throw new Error(error.message);
  }
}