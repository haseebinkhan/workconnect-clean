import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function sendWorkConnectEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!process.env.RESEND_API_KEY || !to) return;

  await resend.emails.send({
    from: "WorkConnect <onboarding@resend.dev>",
    to,
    subject,
    html,
  });
}

export function requestCreatedEmail({
  workerName,
  title,
  message,
  area,
  bookingId,
}: {
  workerName: string;
  title: string;
  message: string;
  area: string;
  bookingId: string;
}) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2>New work request on WorkConnect</h2>
      <p>Hello ${workerName || "there"},</p>
      <p>You have received a new work request.</p>
      <p><strong>Title:</strong> ${title}</p>
      <p><strong>Area:</strong> ${area}</p>
      <p><strong>Message:</strong><br/>${message}</p>
      <p>
        <a href="${siteUrl}/messages/${bookingId}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none">
          View request
        </a>
      </p>
    </div>
  `;
}

export function requestAcceptedEmail({
  hirerName,
  workerName,
  bookingId,
}: {
  hirerName: string;
  workerName: string;
  bookingId: string;
}) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2>Your request was accepted</h2>
      <p>Hello ${hirerName || "there"},</p>
      <p>${workerName || "The worker"} has accepted your request on WorkConnect.</p>
      <p>
        <a href="${siteUrl}/messages/${bookingId}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none">
          Open conversation
        </a>
      </p>
    </div>
  `;
}

export function newMessageEmail({
  recipientName,
  senderName,
  bookingId,
  message,
}: {
  recipientName: string;
  senderName: string;
  bookingId: string;
  message: string;
}) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2>New message on WorkConnect</h2>
      <p>Hello ${recipientName || "there"},</p>
      <p>You have received a new message from ${senderName || "someone"}.</p>
      <p><strong>Message preview:</strong><br/>${message}</p>
      <p>
        <a href="${siteUrl}/messages/${bookingId}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none">
          Reply now
        </a>
      </p>
    </div>
  `;
}
