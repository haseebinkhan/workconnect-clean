import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeRecipients(to: string | string[]) {
  const recipients = Array.isArray(to) ? to : [to];

  return recipients
    .map((email) => (typeof email === "string" ? email.trim().toLowerCase() : ""))
    .filter((email, index, arr) => email.length > 3 && arr.indexOf(email) === index);
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailInput) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY");
      return { success: false, error: "Missing RESEND_API_KEY" };
    }

    const cleanRecipients = normalizeRecipients(to);
    const cleanSubject = subject.trim();
    const cleanHtml = html.trim();
    const cleanText = text?.trim() || stripHtml(cleanHtml);

    if (cleanRecipients.length === 0) {
      return { success: false, error: "No valid recipients" };
    }

    if (!cleanSubject) {
      return { success: false, error: "Missing subject" };
    }

    if (!cleanHtml) {
      return { success: false, error: "Missing html" };
    }

    const { data, error } = await resend.emails.send({
      from: "WorkConnect <noreply@workconnect.uk>",
      to: cleanRecipients,
      subject: cleanSubject,
      html: cleanHtml,
      text: cleanText,
    });

    if (error) {
      console.error("Email error:", error);
      return {
        success: false,
        error: String(error.message || error.name || error),
      };
    }

    return {
      success: true,
      id: data?.id ?? null,
    };
  } catch (err) {
    console.error("Email send failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown email error",
    };
  }
}