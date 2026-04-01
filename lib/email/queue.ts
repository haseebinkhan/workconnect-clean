import { sendEmail } from "@/lib/email/send";

export async function enqueueEmail({
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

  // ✅ 1. TRY INSTANT SEND FIRST
  try {
    const result = await sendEmail({
      to: cleanEmail,
      subject: cleanSubject,
      html: cleanHtml,
    });

    if (result.success) {
      return { instant: true };
    }
  } catch (err) {
    console.error("Instant email failed, fallback to queue");
  }

  // ✅ 2. FALLBACK → QUEUE
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
    throw new Error(error.message || "Could not queue email.");
  }

  return { queued: true, id: data.id };
}