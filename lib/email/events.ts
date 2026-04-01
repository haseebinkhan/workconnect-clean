import {
  queueApplicationAcceptedEmail,
  applicationRejectedEmail,
  bookingAcceptedEmail,
  bookingCancelledEmail,
  jobApprovedEmail,
  jobPausedEmail,
  jobRejectedEmail,
  newRegionalJobEmail,
  newRequestEmail,
} from "@/lib/email/events";
import { enqueueEmail, enqueueEmailsBulk } from "@/lib/email/queue";

type QueueJobApprovedEmailInput = {
  userId?: string | null;
  toEmail: string;
  hirerName: string;
  jobTitle: string;
};

export async function queueJobApprovedEmail({
  userId = null,
  toEmail,
  hirerName,
  jobTitle,
}: QueueJobApprovedEmailInput) {
  return enqueueEmail({
    userId,
    toEmail,
    subject: "Your WorkConnect job is now live",
    html: jobApprovedEmail({
      hirerName,
      jobTitle,
    }),
    emailType: "job_approved",
    meta: {
      job_title: jobTitle,
    },
  });
}

type QueueJobPausedEmailInput = {
  userId?: string | null;
  toEmail: string;
  hirerName: string;
  jobTitle: string;
  reason: string;
};

export async function queueJobPausedEmail({
  userId = null,
  toEmail,
  hirerName,
  jobTitle,
  reason,
}: QueueJobPausedEmailInput) {
  return enqueueEmail({
    userId,
    toEmail,
    subject: "Your WorkConnect job has been paused",
    html: jobPausedEmail({
      hirerName,
      jobTitle,
      reason,
    }),
    emailType: "job_paused",
    meta: {
      job_title: jobTitle,
      reason,
    },
  });
}

type QueueJobRejectedEmailInput = {
  userId?: string | null;
  toEmail: string;
  hirerName: string;
  jobTitle: string;
  reason: string;
};


export async function queueJobRejectedEmail({
  userId = null,
  toEmail,
  hirerName,
  jobTitle,
  reason,
}: QueueJobRejectedEmailInput) {
  return enqueueEmail({
    userId,
    toEmail,
    subject: "Your WorkConnect job was not approved",
    html: jobRejectedEmail({
      hirerName,
      jobTitle,
      reason,
    }),
    emailType: "job_rejected",
    meta: {
      job_title: jobTitle,
      reason,
    },
  });
}

type QueueApplicationAcceptedEmailInput = {
  userId?: string | null;
  toEmail: string;
  workerName: string;
  jobTitle: string;
  location: string;
};

export async function queueApplicationAcceptedEmail({
  userId = null,
  toEmail,
  workerName,
  jobTitle,
  location,
}: QueueApplicationAcceptedEmailInput) {
  return enqueueEmail({
    userId,
    toEmail,
    subject: "Your application was accepted",
    html: queueApplicationAcceptedEmail({
      workerName,
      jobTitle,
      location,
    }),
    emailType: "application_accepted",
    meta: {
      job_title: jobTitle,
      location,
    },
  });
}

type QueueApplicationRejectedEmailInput = {
  userId?: string | null;
  toEmail: string;
  workerName: string;
  jobTitle: string;
  location: string;
};

export async function queueApplicationRejectedEmail({
  userId = null,
  toEmail,
  workerName,
  jobTitle,
  location,
}: QueueApplicationRejectedEmailInput) {
  return enqueueEmail({
    userId,
    toEmail,
    subject: "Application update",
    html: applicationRejectedEmail({
      workerName,
      jobTitle,
      location,
    }),
    emailType: "application_rejected",
    meta: {
      job_title: jobTitle,
      location,
    },
  });
}

type QueueBookingAcceptedEmailInput = {
  userId?: string | null;
  toEmail: string;
  userName: string;
  bookingTitle: string;
  location: string;
};

export async function queueBookingAcceptedEmail({
  userId = null,
  toEmail,
  userName,
  bookingTitle,
  location,
}: QueueBookingAcceptedEmailInput) {
  return enqueueEmail({
    userId,
    toEmail,
    subject: "Booking accepted",
    html: bookingAcceptedEmail({
      userName,
      bookingTitle,
      location,
    }),
    emailType: "booking_accepted",
    meta: {
      booking_title: bookingTitle,
      location,
    },
  });
}

type QueueBookingCancelledEmailInput = {
  userId?: string | null;
  toEmail: string;
  userName: string;
  bookingTitle: string;
  location: string;
};

export async function queueBookingCancelledEmail({
  userId = null,
  toEmail,
  userName,
  bookingTitle,
  location,
}: QueueBookingCancelledEmailInput) {
  return enqueueEmail({
    userId,
    toEmail,
    subject: "Booking cancelled",
    html: bookingCancelledEmail({
      userName,
      bookingTitle,
      location,
    }),
    emailType: "booking_cancelled",
    meta: {
      booking_title: bookingTitle,
      location,
    },
  });
}

type QueueNewRequestEmailInput = {
  userId?: string | null;
  toEmail: string;
  workerName: string;
  hirerName: string;
  requestTitle: string;
  message: string;
  meetingTime?: string | null;
};

export async function queueNewRequestEmail({
  userId = null,
  toEmail,
  workerName,
  hirerName,
  requestTitle,
  message,
  meetingTime = null,
}: QueueNewRequestEmailInput) {
  return enqueueEmail({
    userId,
    toEmail,
    subject: "New work request received",
    html: newRequestEmail({
      workerName,
      hirerName,
      requestTitle,
      message,
      meetingTime,
    }),
    emailType: "new_request",
    meta: {
      request_title: requestTitle,
      meeting_time: meetingTime,
    },
  });
}

type QueueRegionalJobAlertsInput = {
  audience: Array<{
    userId?: string | null;
    toEmail: string;
    userName: string;
  }>;
  jobTitle: string;
  category: string;
  location: string;
  budget: string;
};

export async function queueRegionalJobAlerts({
  audience,
  jobTitle,
  category,
  location,
  budget,
}: QueueRegionalJobAlertsInput) {
  if (!audience.length) {
    return [];
  }

  const jobs = audience.map((item) => ({
    userId: item.userId || null,
    toEmail: item.toEmail,
    subject: `New WorkConnect job in your area`,
    html: newRegionalJobEmail({
      userName: item.userName,
      jobTitle,
      category,
      location,
      budget,
    }),
    emailType: "regional_job_alert",
    meta: {
      job_title: jobTitle,
      category,
      location,
      budget,
    },
  }));

  return enqueueEmailsBulk(jobs);
}
export function newRegionalJobEmail({ userName, jobTitle }: any) {
  return `<p>Hello ${userName}, new job: ${jobTitle}</p>`;
}