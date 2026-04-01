// ================= APPLICATION EMAILS =================

export function applicationAcceptedEmail({
  workerName,
  jobTitle,
  location,
}: any) {
  return `
    <p>Hi ${workerName},</p>
    <p>Your application for <b>${jobTitle}</b> has been accepted 🎉</p>
    <p>Location: ${location}</p>
  `;
}

export function applicationRejectedEmail({
  workerName,
  jobTitle,
  location,
}: any) {
  return `
    <p>Hi ${workerName},</p>
    <p>Your application for <b>${jobTitle}</b> was not selected.</p>
    <p>Location: ${location}</p>
  `;
}

// ================= BOOKING EMAILS =================

export function bookingAcceptedEmail({
  userName,
  bookingTitle,
  location,
}: any) {
  return `
    <p>Hi ${userName},</p>
    <p>Your booking <b>${bookingTitle}</b> has been accepted.</p>
    <p>${location}</p>
  `;
}

export function bookingCancelledEmail({
  userName,
  bookingTitle,
  location,
}: any) {
  return `
    <p>Hi ${userName},</p>
    <p>Your booking <b>${bookingTitle}</b> was cancelled.</p>
    <p>${location}</p>
  `;
}

// ================= JOB EMAILS =================

export function jobApprovedEmail({ hirerName, jobTitle }: any) {
  return `
    <p>Hi ${hirerName},</p>
    <p>Your job <b>${jobTitle}</b> is now live 🚀</p>
  `;
}

export function jobPausedEmail({ hirerName, jobTitle, reason }: any) {
  return `
    <p>Hi ${hirerName},</p>
    <p>Your job <b>${jobTitle}</b> has been paused.</p>
    <p>Reason: ${reason}</p>
  `;
}

export function jobRejectedEmail({ hirerName, jobTitle, reason }: any) {
  return `
    <p>Hi ${hirerName},</p>
    <p>Your job <b>${jobTitle}</b> was rejected.</p>
    <p>Reason: ${reason}</p>
  `;
}

// ================= REQUEST EMAIL =================

export function newRequestEmail({
  workerName,
  hirerName,
  requestTitle,
  message,
  meetingTime,
}: any) {
  return `
    <p>Hi ${workerName},</p>
    <p>${hirerName} sent you a request: <b>${requestTitle}</b></p>
    <p>${message}</p>
    ${meetingTime ? `<p>Meeting: ${meetingTime}</p>` : ""}
  `;
}

// ================= REGIONAL JOB =================

export function newRegionalJobEmail({
  userName,
  jobTitle,
  category,
  location,
  budget,
}: any) {
  return `
    <p>Hi ${userName},</p>
    <p>New job in your area:</p>
    <p><b>${jobTitle}</b></p>
    <p>${category} - ${location}</p>
    <p>Budget: ${budget}</p>
  `;
}
