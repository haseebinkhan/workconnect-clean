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

function baseEmailLayout({
  heading,
  greeting,
  intro,
  details,
  buttonText,
  buttonUrl,
}: {
  heading: string;
  greeting: string;
  intro: string;
  details: string[];
  buttonText: string;
  buttonUrl: string;
}) {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #0f172a; background: #f8fafc; padding: 24px;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="padding: 24px 24px 12px;">
          <h2 style="margin: 0 0 16px; color: #111827;">${heading}</h2>
          <p style="margin: 0 0 12px;">${greeting}</p>
          <p style="margin: 0 0 16px;">${intro}</p>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0;">
            ${details.map((item) => `<p style="margin: 0 0 8px;">${item}</p>`).join("")}
          </div>

          <a
            href="${buttonUrl}"
            style="display: inline-block; padding: 12px 18px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600;"
          >
            ${buttonText}
          </a>

          <p style="margin-top: 24px; color: #475569;">WorkConnect Team</p>
        </div>
      </div>
    </div>
  `;
}

export function jobApprovedEmail({
  hirerName,
  jobTitle,
}: {
  hirerName: string;
  jobTitle: string;
}) {
  return baseEmailLayout({
    heading: "Your job is now live",
    greeting: `Hi ${hirerName},`,
    intro: `Your job has been approved and is now visible to workers on WorkConnect.`,
    details: [`<strong>Job:</strong> ${jobTitle}`],
    buttonText: "View my job posts",
    buttonUrl: "https://workconnect.uk/my-job-posts",
  });
}

export function jobPausedEmail({
  hirerName,
  jobTitle,
  reason,
}: {
  hirerName: string;
  jobTitle: string;
  reason: string;
}) {
  return baseEmailLayout({
    heading: "Your job has been paused",
    greeting: `Hi ${hirerName},`,
    intro: `Your job has been paused by the admin team.`,
    details: [
      `<strong>Job:</strong> ${jobTitle}`,
      `<strong>Reason:</strong> ${reason}`,
    ],
    buttonText: "View my job posts",
    buttonUrl: "https://workconnect.uk/my-job-posts",
  });
}

export function jobRejectedEmail({
  hirerName,
  jobTitle,
  reason,
}: {
  hirerName: string;
  jobTitle: string;
  reason: string;
}) {
  return baseEmailLayout({
    heading: "Your job was not approved",
    greeting: `Hi ${hirerName},`,
    intro: `Your submitted job was rejected by the admin team.`,
    details: [
      `<strong>Job:</strong> ${jobTitle}`,
      `<strong>Reason:</strong> ${reason}`,
    ],
    buttonText: "View my job posts",
    buttonUrl: "https://workconnect.uk/my-job-posts",
  });
}

export function applicationAcceptedEmail({
  workerName,
  jobTitle,
  location,
}: {
  workerName: string;
  jobTitle: string;
  location: string;
}) {
  return baseEmailLayout({
    heading: "Your application was accepted",
    greeting: `Hi ${workerName},`,
    intro: `Great news. Your application has been accepted and a booking has been created.`,
    details: [
      `<strong>Job:</strong> ${jobTitle}`,
      `<strong>Location:</strong> ${location}`,
    ],
    buttonText: "Open dashboard",
    buttonUrl: "https://workconnect.uk/dashboard",
  });
}

export function applicationRejectedEmail({
  workerName,
  jobTitle,
  location,
}: {
  workerName: string;
  jobTitle: string;
  location: string;
}) {
  return baseEmailLayout({
    heading: "Application update",
    greeting: `Hi ${workerName},`,
    intro: `Your application was not successful this time.`,
    details: [
      `<strong>Job:</strong> ${jobTitle}`,
      `<strong>Location:</strong> ${location}`,
    ],
    buttonText: "Browse jobs",
    buttonUrl: "https://workconnect.uk/jobs",
  });
}

export function bookingAcceptedEmail({
  userName,
  bookingTitle,
  location,
}: {
  userName: string;
  bookingTitle: string;
  location: string;
}) {
  return baseEmailLayout({
    heading: "Booking accepted",
    greeting: `Hi ${userName},`,
    intro: `A booking has been accepted on WorkConnect.`,
    details: [
      `<strong>Booking:</strong> ${bookingTitle}`,
      `<strong>Location:</strong> ${location}`,
    ],
    buttonText: "Open dashboard",
    buttonUrl: "https://workconnect.uk/dashboard",
  });
}

export function bookingCancelledEmail({
  userName,
  bookingTitle,
  location,
}: {
  userName: string;
  bookingTitle: string;
  location: string;
}) {
  return baseEmailLayout({
    heading: "Booking cancelled",
    greeting: `Hi ${userName},`,
    intro: `A booking on WorkConnect has been cancelled.`,
    details: [
      `<strong>Booking:</strong> ${bookingTitle}`,
      `<strong>Location:</strong> ${location}`,
    ],
    buttonText: "Open dashboard",
    buttonUrl: "https://workconnect.uk/dashboard",
  });
}

export function newRegionalJobEmail({
  userName,
  jobTitle,
  category,
  location,
  budget,
}: {
  userName: string;
  jobTitle: string;
  category: string;
  location: string;
  budget: string;
}) {
  return baseEmailLayout({
    heading: "New job in your area",
    greeting: `Hi ${userName},`,
    intro: `A new job matching your region has just gone live on WorkConnect.`,
    details: [
      `<strong>Job:</strong> ${jobTitle}`,
      `<strong>Category:</strong> ${category}`,
      `<strong>Location:</strong> ${location}`,
      `<strong>Budget:</strong> ${budget}`,
    ],
    buttonText: "Browse jobs",
    buttonUrl: "https://workconnect.uk/jobs",
  });
}