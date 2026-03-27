export function newRequestEmail({
  workerName,
  hirerName,
  jobTitle,
}: {
  workerName: string;
  hirerName: string;
  jobTitle: string;
}) {
  return `
    <div style="font-family: Arial; line-height: 1.6;">
      <h2>New Job Request</h2>
      <p>Hi ${workerName},</p>

      <p>You have received a new job request.</p>

      <p><strong>From:</strong> ${hirerName}</p>
      <p><strong>Job:</strong> ${jobTitle}</p>

      <p>Please log in to your dashboard to respond.</p>

      <a href="https://workconnect.uk/dashboard"
         style="display:inline-block;padding:10px 15px;background:#111;color:#fff;border-radius:6px;text-decoration:none;">
         View Request
      </a>

      <p style="margin-top:20px;">WorkConnect Team</p>
    </div>
  `;
}