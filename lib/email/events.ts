const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "https://workconnect.uk";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildLoginUrl(nextPath = "/dashboard") {
  const safeNext = nextPath.startsWith("/") ? nextPath : "/dashboard";
  return `${APP_URL}/auth/login?next=${encodeURIComponent(safeNext)}`;
}

function buildButton(url: string, label: string) {
  return `
    <div style="margin-top:24px;">
      <a
        href="${escapeHtml(url)}"
        style="
          display:inline-block;
          background:#0f172a;
          color:#ffffff;
          text-decoration:none;
          padding:12px 18px;
          border-radius:12px;
          font-weight:600;
          font-size:14px;
        "
      >
        ${escapeHtml(label)}
      </a>
    </div>
  `;
}

function wrapEmailTemplate({
  title,
  intro,
  rows,
  buttonLabel,
  buttonUrl,
}: {
  title: string;
  intro: string;
  rows?: Array<{ label: string; value: string | null | undefined }>;
  buttonLabel?: string;
  buttonUrl?: string;
}) {
  const safeTitle = escapeHtml(title);
  const safeIntro = escapeHtml(intro);

  const detailsHtml =
    rows && rows.length
      ? rows
          .filter((row) => row.value)
          .map(
            (row) => `
              <tr>
                <td style="padding:10px 0; vertical-align:top; color:#64748b; font-size:14px; width:170px;">
                  ${escapeHtml(row.label)}
                </td>
                <td style="padding:10px 0; vertical-align:top; color:#0f172a; font-size:14px;">
                  ${escapeHtml(row.value)}
                </td>
              </tr>
            `
          )
          .join("")
      : "";

  const buttonHtml =
    buttonLabel && buttonUrl ? buildButton(buttonUrl, buttonLabel) : "";

  return `
    <div style="margin:0; padding:24px; background:#f8fafc; font-family:Arial, sans-serif;">
      <div style="max-width:620px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden;">
        <div style="padding:24px 24px 12px;">
          <h2 style="margin:0 0 12px; color:#0f172a; font-size:24px; line-height:1.3;">
            ${safeTitle}
          </h2>
          <p style="margin:0; color:#334155; font-size:15px; line-height:1.7;">
            ${safeIntro}
          </p>
          ${buttonHtml}
        </div>

        ${
          detailsHtml
            ? `
              <div style="padding:8px 24px 24px;">
                <table style="width:100%; border-collapse:collapse;">
                  ${detailsHtml}
                </table>
              </div>
            `
            : ""
        }

        <div style="padding:16px 24px 24px; color:#64748b; font-size:13px;">
          WorkConnect
        </div>
      </div>
    </div>
  `;
}

export function applicationAcceptedEmail({
  workerName,
  jobTitle,
  location,
}: {
  workerName: string;
  jobTitle: string;
  location?: string | null;
}) {
  return wrapEmailTemplate({
    title: "Application accepted",
    intro: `Hi ${workerName}, your application has been accepted.`,
    rows: [
      { label: "Job", value: jobTitle },
      { label: "Location", value: location || "Not specified" },
    ],
    buttonLabel: "Log in to WorkConnect",
    buttonUrl: buildLoginUrl("/my-applications"),
  });
}

export function applicationRejectedEmail({
  workerName,
  jobTitle,
  location,
}: {
  workerName: string;
  jobTitle: string;
  location?: string | null;
}) {
  return wrapEmailTemplate({
    title: "Application update",
    intro: `Hi ${workerName}, your application was not selected this time.`,
    rows: [
      { label: "Job", value: jobTitle },
      { label: "Location", value: location || "Not specified" },
    ],
    buttonLabel: "Log in to WorkConnect",
    buttonUrl: buildLoginUrl("/my-applications"),
  });
}

export function bookingAcceptedEmail({
  userName,
  bookingTitle,
  location,
  bookingId,
}: {
  userName: string;
  bookingTitle: string;
  location?: string | null;
  bookingId?: string | null;
}) {
  return wrapEmailTemplate({
    title: "Booking accepted",
    intro: `Hi ${userName}, your booking request has been accepted.`,
    rows: [
      { label: "Booking", value: bookingTitle },
      { label: "Location", value: location || "Not specified" },
    ],
    buttonLabel: "View booking",
    buttonUrl: buildLoginUrl(
      bookingId ? `/messages/${bookingId}` : "/my-requests"
    ),
  });
}

export function bookingRejectedEmail({
  userName,
  bookingTitle,
  location,
}: {
  userName: string;
  bookingTitle: string;
  location?: string | null;
}) {
  return wrapEmailTemplate({
    title: "Booking rejected",
    intro: `Hi ${userName}, your booking request was rejected.`,
    rows: [
      { label: "Booking", value: bookingTitle },
      { label: "Location", value: location || "Not specified" },
    ],
    buttonLabel: "Log in to WorkConnect",
    buttonUrl: buildLoginUrl("/my-requests"),
  });
}

export function bookingCancelledEmail({
  userName,
  bookingTitle,
  location,
  reason,
  bookingId,
}: {
  userName: string;
  bookingTitle: string;
  location?: string | null;
  reason?: string | null;
  bookingId?: string | null;
}) {
  return wrapEmailTemplate({
    title: "Booking cancelled",
    intro: `Hi ${userName}, this booking has been cancelled.`,
    rows: [
      { label: "Booking", value: bookingTitle },
      { label: "Location", value: location || "Not specified" },
      { label: "Reason", value: reason || "No reason provided" },
    ],
    buttonLabel: "View details",
    buttonUrl: buildLoginUrl(
      bookingId ? `/messages/${bookingId}` : "/my-requests"
    ),
  });
}

export function newRequestEmail({
  workerName,
  hirerName,
  requestTitle,
  message,
  meetingTime,
  location,
  bookingId,
}: {
  workerName: string;
  hirerName: string;
  requestTitle: string;
  message: string;
  meetingTime?: string | null;
  location?: string | null;
  bookingId?: string | null;
}) {
  return wrapEmailTemplate({
    title: "New work request received",
    intro: `Hi ${workerName}, you received a new work request from ${hirerName}.`,
    rows: [
      { label: "Request", value: requestTitle },
      { label: "Message", value: message },
      { label: "Preferred meeting time", value: meetingTime || "Not specified" },
      { label: "Location", value: location || "Not specified" },
    ],
    buttonLabel: "Open request",
    buttonUrl: buildLoginUrl(
      bookingId ? `/messages/${bookingId}` : "/requests"
    ),
  });
}

export function workStartedEmail({
  userName,
  bookingTitle,
  location,
  bookingId,
}: {
  userName: string;
  bookingTitle: string;
  location?: string | null;
  bookingId?: string | null;
}) {
  return wrapEmailTemplate({
    title: "Work started",
    intro: `Hi ${userName}, work has started on this booking.`,
    rows: [
      { label: "Booking", value: bookingTitle },
      { label: "Location", value: location || "Not specified" },
    ],
    buttonLabel: "View booking",
    buttonUrl: buildLoginUrl(
      bookingId ? `/messages/${bookingId}` : "/my-requests"
    ),
  });
}

export function workMarkedDoneEmail({
  userName,
  bookingTitle,
  location,
  bookingId,
}: {
  userName: string;
  bookingTitle: string;
  location?: string | null;
  bookingId?: string | null;
}) {
  return wrapEmailTemplate({
    title: "Work marked as done",
    intro: `Hi ${userName}, the worker marked this booking as done.`,
    rows: [
      { label: "Booking", value: bookingTitle },
      { label: "Location", value: location || "Not specified" },
    ],
    buttonLabel: "Review booking",
    buttonUrl: buildLoginUrl(
      bookingId ? `/messages/${bookingId}` : "/my-requests"
    ),
  });
}

export function bookingCompletedEmail({
  userName,
  bookingTitle,
  location,
  bookingId,
}: {
  userName: string;
  bookingTitle: string;
  location?: string | null;
  bookingId?: string | null;
}) {
  return wrapEmailTemplate({
    title: "Booking completed",
    intro: `Hi ${userName}, this booking has been completed.`,
    rows: [
      { label: "Booking", value: bookingTitle },
      { label: "Location", value: location || "Not specified" },
    ],
    buttonLabel: "Open booking",
    buttonUrl: buildLoginUrl(
      bookingId ? `/messages/${bookingId}` : "/my-jobs"
    ),
  });
}

export function newMessageEmail({
  userName,
  bookingTitle,
  senderName,
  preview,
  bookingId,
}: {
  userName: string;
  bookingTitle?: string | null;
  senderName: string;
  preview: string;
  bookingId?: string | null;
}) {
  return wrapEmailTemplate({
    title: "New message on WorkConnect",
    intro: `Hi ${userName}, you received a new message from ${senderName}.`,
    rows: [
      { label: "Booking", value: bookingTitle || "Booking conversation" },
      { label: "Message preview", value: preview },
    ],
    buttonLabel: "Open conversation",
    buttonUrl: buildLoginUrl(
      bookingId ? `/messages/${bookingId}` : "/messages"
    ),
  });
}

export function jobApprovedEmail({
  hirerName,
  jobTitle,
}: {
  hirerName: string;
  jobTitle: string;
}) {
  return wrapEmailTemplate({
    title: "Job approved",
    intro: `Hi ${hirerName}, your job is now live.`,
    rows: [{ label: "Job", value: jobTitle }],
    buttonLabel: "View my jobs",
    buttonUrl: buildLoginUrl("/my-job-posts"),
  });
}

export function jobPausedEmail({
  hirerName,
  jobTitle,
  reason,
}: {
  hirerName: string;
  jobTitle: string;
  reason?: string | null;
}) {
  return wrapEmailTemplate({
    title: "Job paused",
    intro: `Hi ${hirerName}, your job has been paused.`,
    rows: [
      { label: "Job", value: jobTitle },
      { label: "Reason", value: reason || "No reason provided" },
    ],
    buttonLabel: "View my jobs",
    buttonUrl: buildLoginUrl("/my-job-posts"),
  });
}

export function jobRejectedEmail({
  hirerName,
  jobTitle,
  reason,
}: {
  hirerName: string;
  jobTitle: string;
  reason?: string | null;
}) {
  return wrapEmailTemplate({
    title: "Job rejected",
    intro: `Hi ${hirerName}, your job was rejected.`,
    rows: [
      { label: "Job", value: jobTitle },
      { label: "Reason", value: reason || "No reason provided" },
    ],
    buttonLabel: "View my jobs",
    buttonUrl: buildLoginUrl("/my-job-posts"),
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
  category?: string | null;
  location?: string | null;
  budget?: string | null;
}) {
  return wrapEmailTemplate({
    title: "New job in your area",
    intro: `Hi ${userName}, a new job was posted in your area.`,
    rows: [
      { label: "Job", value: jobTitle },
      { label: "Category", value: category || "Not specified" },
      { label: "Location", value: location || "Not specified" },
      { label: "Budget", value: budget || "Not specified" },
    ],
    buttonLabel: "Browse jobs",
    buttonUrl: buildLoginUrl("/jobs"),
  });
}