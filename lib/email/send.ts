import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY");
      return { success: false, error: "Missing RESEND_API_KEY" };
    }

    const recipients = Array.isArray(to) ? to : [to];
    const cleanRecipients = recipients
      .map((email) =>
        typeof email === "string" ? email.trim().toLowerCase() : ""
      )
      .filter((email) => email.length > 3);

    if (cleanRecipients.length === 0) {
      return { success: false, error: "No valid recipients" };
    }

    const { data, error } = await resend.emails.send({
      from: "WorkConnect <noreply@workconnect.uk>",
      to: cleanRecipients,
      subject,
      html,
    });

    if (error) {
      console.error("Email error:", error);
      return { success: false, error: String(error.message || error.name || error) };
    }

    return { success: true, id: data?.id ?? null };
  } catch (err) {
    console.error("Email send failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown email error",
    };
  }
}
