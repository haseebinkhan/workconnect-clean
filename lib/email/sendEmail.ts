import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    const { error } = await resend.emails.send({
      from: "WorkConnect <noreply@workconnect.uk>",
      to,
      subject,
      html,
    });

    if (error) {
      console.error("Email error:", error);
    }
  } catch (err) {
    console.error("Email send failed:", err);
  }
}