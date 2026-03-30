import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[]; // ✅ allow bulk emails
  subject: string;
  html: string;
}) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY");
      return;
    }

    // normalize recipients
    const recipients = Array.isArray(to) ? to : [to];

    // remove invalid / empty emails
    const cleanRecipients = recipients
      .map((email) => (typeof email === "string" ? email.trim().toLowerCase() : ""))
      .filter((email) => email.length > 3);

    if (cleanRecipients.length === 0) {
      console.error("No valid recipients");
      return;
    }

    const { data, error } = await resend.emails.send({
      from: "WorkConnect <noreply@workconnect.uk>",
      to: cleanRecipients, // ✅ works for batch
      subject,
      html,
    });

    if (error) {
      console.error("Email error:", error);
      return;
    }

    console.log("Email sent:", data?.id || cleanRecipients.length);
  } catch (err) {
    console.error("Email send failed:", err);
  }
}