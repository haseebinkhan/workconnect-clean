import {
  applicationAcceptedEmail,
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

/* ================= JOB EMAILS ================= */

export async function queueJobApprovedEmail({
  userId = null,
  toEmail,
  hirerName,
  jobTitle,
}: any) {
  return enqueueEmail({
    userId,
    toEmail,
    subject: "Your WorkConnect job is now live",
    html: jobApprovedEmail({ hirerName, jobTitle }),
    emailType: "job_approved",
    meta: { job_title: jobTitle },
  });
}

export async function queueJobPausedEmail({
  userId = null,
  toEmail,
  hirerName,
  jobTitle,
  reason,
}: any) {
  return enqueueEmail({
    userId,
    toEmail,
    subject: "Your WorkConnect job has been paused",
    html: jobPausedEmail({ hirerName, jobTitle, reason }),
    emailType: "job_paused",
    meta: { job_title: jobTitle, reason },
  });
}

export async function queueJobRejectedEmail({
  userId = null,
  toEmail,
  hirerName,
  jobTitle,
  reason,
}: any) {
  return enqueueEmail({
    userId,
    toEmail,
    subject: "Your WorkConnect job was not approved",
    html: jobRejectedEmail({ hirerName, jobTitle, reason }),
    emailType: "job_rejected",
    meta: { job_title: jobTitle, reason },
  });
}

/* ================= APPLICATION EMAILS ================= */

export async function queueApplicationAcceptedEmail({
  userId = null,
  toEmail,
  workerName,
  jobTitle,
  location,
}: any) {
  return enqueueEmail({
    userId,
    toEmail,
    subject: "Your application was accepted",
    html: applicationAcceptedEmail({
      workerName,
      jobTitle,
      location,
    }),
    emailType: "application_accepted",
    meta: { job_title: jobTitle, location },
  });
}

export async function queueApplicationRejectedEmail({
  userId = null,
  toEmail,
  workerName,
  jobTitle,
  location,
}: any) {
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
    meta: { job_title: jobTitle, location },
  });
}

/* ================= BOOKING EMAILS ================= */

export async function queueBookingAcceptedEmail({
  userId = null,
  toEmail,
  userName,
  bookingTitle,
  location,
}: any) {
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
    meta: { booking_title: bookingTitle, location },
  });
}

export async function queueBookingCancelledEmail({
  userId = null,
  toEmail,
  userName,
  bookingTitle,
  location,
}: any) {
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
    meta: { booking_title: bookingTitle, location },
  });
}

/* ================= REQUEST EMAIL ================= */

export async function queueNewRequestEmail({
  userId = null,
  toEmail,
  workerName,
  hirerName,
  requestTitle,
  message,
  meetingTime = null,
}: any) {
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

/* ================= REGIONAL JOB ALERT ================= */

export async function queueRegionalJobAlerts({
  audience,
  jobTitle,
  category,
  location,
  budget,
}: any) {
  if (!audience.length) return [];

  const jobs = audience.map((item: any) => ({
    userId: item.userId || null,
    toEmail: item.toEmail,
    subject: "New WorkConnect job in your area",
    html: newRegionalJobEmail({
      userName: item.userName,
      jobTitle,
      category,
      location,
      budget,
    }),
    emailType: "regional_job_alert",
    meta: { job_title: jobTitle, category, location, budget },
  }));

  return enqueueEmailsBulk(jobs);
}