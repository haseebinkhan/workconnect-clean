export function newRequestEmail({
  workerName,
  hirerName,
  requestTitle,
  message,
  meetingTime,
}: {
  workerName: string;
  hirerName: string;
  requestTitle: string;
  message: string;
  meetingTime?: string | null;
}) {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #0f172a;">
      <div style="max-width: 640px; margin: 0 auto; padding: 24px;">
        <h2 style="margin: 0 0 16px; color: #111827;">New work request received</h2>

        <p style="margin: 0 0 12px;">Hi ${workerName},</p>

        <p style="margin: 0 0 12px;">
          You have received a new work request on <strong>WorkConnect</strong>.
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px;"><strong>From:</strong> ${hirerName}</p>
          <p style="margin: 0 0 8px;"><strong>Request:</strong> ${requestTitle}</p>
          ${
            meetingTime
              ? `<p style="margin: 0 0 8px;"><strong>Meeting time:</strong> ${meetingTime}</p>`
              : ""
          }
          <p style="margin: 0;"><strong>Message:</strong><br/>${message.replace(/\n/g, "<br/>")}</p>
        </div>

        <p style="margin: 0 0 18px;">
          Please log in to your dashboard to respond to this request.
        </p>

        <a
          href="https://workconnect.uk/requests"
          style="display: inline-block; padding: 12px 18px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600;"
        >
          View request
        </a>

        <p style="margin-top: 24px; color: #475569;">
          WorkConnect Team
        </p>
      </div>
    </div>
  `;
}

