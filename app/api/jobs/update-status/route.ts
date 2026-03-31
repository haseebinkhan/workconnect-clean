import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { enqueueEmails } from "@/lib/email/queue";
import {
  applicationAcceptedEmail,
  applicationRejectedEmail,
  bookingAcceptedEmail,
} from "@/lib/email/templates";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ActionType = "accepted" | "rejected";

function normalizeAction(value: unknown): ActionType | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v === "accepted" || v === "rejected") return v;
  return null;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function buildLocationText({
  country,
  region,
  city,
  postcode,
  postcodePrefix,
  postcodeFull,
  areaSlug,
}: {
  country?: string | null;
  region?: string | null;
  city?: string | null;
  postcode?: string | null;
  postcodePrefix?: string | null;
  postcodeFull?: string | null;
  areaSlug?: string | null;
}) {
  const parts = [city, region, country].filter(Boolean);
  const base = parts.join(", ");

  if (postcodeFull) {
    return base ? `${base} (${postcodeFull})` : postcodeFull;
  }

  if (postcodePrefix) {
    return base ? `${base} (${postcodePrefix})` : postcodePrefix;
  }

  if (postcode) {
    return base ? `${base} (${postcode})` : postcode;
  }

  return base || areaSlug || "Location not specified";
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();

    const applicationId = normalizeText(body?.applicationId);
    const action = normalizeAction(body?.action);

    if (!applicationId || !action) {
      return NextResponse.json(
        { error: "Missing applicationId or action." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const { data: application, error: applicationError } = await adminSupabase
      .from("job_applications")
      .select(`
        id,
        job_id,
        worker_id,
        cover_message,
        proposed_rate,
        currency_code,
        status,
        created_at,
        updated_at,
        phone,
        availability_type,
        start_date,
        portfolio_url,
        linkedin_url,
        cv_url
      `)
      .eq("id", applicationId)
      .maybeSingle();

    if (applicationError || !application) {
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404 }
      );
    }

    if (application.status !== "pending") {
      return NextResponse.json(
        { error: `This application is already ${application.status}.` },
        { status: 409 }
      );
    }

    const { data: workerProfile, error: workerProfileError } = await adminSupabase
      .from("worker_profiles")
      .select(`
        id,
        user_id,
        headline,
        category,
        country,
        region,
        city,
        area_slug,
        postcode,
        postcode_prefix,
        postcode_full,
        hourly_rate
      `)
      .eq("id", application.worker_id)
      .maybeSingle();

    if (workerProfileError || !workerProfile) {
      return NextResponse.json(
        { error: "Worker profile not found." },
        { status: 404 }
      );
    }

    const { data: workerAccount } = await adminSupabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", workerProfile.user_id)
      .maybeSingle();

    const { data: job, error: jobError } = await adminSupabase
      .from("jobs")
      .select(`
        id,
        hirer_id,
        title,
        description,
        category,
        status,
        visibility,
        location_type,
        country,
        region,
        city,
        area_slug,
        postcode,
        postcode_prefix,
        postcode_full,
        budget_min,
        budget_max,
        currency_code,
        deleted_at
      `)
      .eq("id", application.job_id)
      .maybeSingle();

    if (jobError || !job || job.deleted_at) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    const { data: hirerProfile, error: hirerProfileError } = await adminSupabase
      .from("hirer_profiles")
      .select(`
        id,
        user_id,
        company_name,
        contact_name
      `)
      .eq("id", job.hirer_id)
      .maybeSingle();

    if (hirerProfileError || !hirerProfile) {
      return NextResponse.json(
        { error: "Hirer profile not found." },
        { status: 404 }
      );
    }

    if (hirerProfile.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const workerLocation = buildLocationText({
      country: workerProfile.country,
      region: workerProfile.region,
      city: workerProfile.city,
      postcode: workerProfile.postcode,
      postcodePrefix: workerProfile.postcode_prefix,
      postcodeFull: workerProfile.postcode_full,
      areaSlug: workerProfile.area_slug,
    });

    const jobLocation = buildLocationText({
      country: job.country,
      region: job.region,
      city: job.city,
      postcode: job.postcode,
      postcodePrefix: job.postcode_prefix,
      postcodeFull: job.postcode_full,
      areaSlug: job.area_slug,
    });

    const workerName = workerAccount?.full_name || "there";
    const workerEmail = workerAccount?.email || "";
    const hirerName =
      hirerProfile.company_name || hirerProfile.contact_name || "Hirer";

    if (action === "rejected") {
      const { error: rejectError } = await adminSupabase
        .from("job_applications")
        .update({
          status: "rejected",
          seen_by_hirer: true,
          seen_by_worker: false,
          updated_at: now,
        })
        .eq("id", application.id);

      if (rejectError) {
        return NextResponse.json(
          { error: rejectError.message || "Could not reject application." },
          { status: 400 }
        );
      }

      await adminSupabase.from("notifications").insert([
        {
          user_id: workerProfile.user_id,
          type: "job_application_rejected",
          title: "Application rejected",
          body: `Your application for "${job.title || "Untitled job"}" was rejected.`,
          meta: {
            application_id: application.id,
            job_id: job.id,
            status: "rejected",
            reviewed_at: now,
            hirer_user_id: hirerProfile.user_id,
            hirer_name: hirerName,
            job_title: job.title,
            job_location: jobLocation,
          },
        },
        {
          user_id: hirerProfile.user_id,
          type: "job_application_status_changed",
          title: "Application rejected",
          body: `You rejected an application for "${job.title || "Untitled job"}".`,
          meta: {
            application_id: application.id,
            job_id: job.id,
            status: "rejected",
            reviewed_at: now,
            worker_user_id: workerProfile.user_id,
            worker_profile_id: workerProfile.id,
          },
        },
      ]);

      if (workerEmail) {
        await enqueueEmails([
          {
            kind: "application_rejected",
            userId: workerAccount?.id || workerProfile.user_id,
            toEmail: workerEmail,
            subject: "Application update",
            html: applicationRejectedEmail({
              workerName,
              jobTitle: job.title || "Untitled job",
              location: jobLocation,
            }),
            meta: {
              application_id: application.id,
              job_id: job.id,
              status: "rejected",
              job_title: job.title || "Untitled job",
              location: jobLocation,
            },
          },
        ]);
      }

      return NextResponse.json({
        success: true,
        status: "rejected",
        message: "Application rejected successfully.",
      });
    }

    const { error: acceptError } = await adminSupabase
      .from("job_applications")
      .update({
        status: "accepted",
        seen_by_hirer: true,
        seen_by_worker: false,
        updated_at: now,
      })
      .eq("id", application.id);

    if (acceptError) {
      return NextResponse.json(
        { error: acceptError.message || "Could not accept application." },
        { status: 400 }
      );
    }

    await adminSupabase
      .from("job_applications")
      .update({
        status: "rejected",
        seen_by_hirer: true,
        seen_by_worker: false,
        updated_at: now,
      })
      .eq("job_id", job.id)
      .neq("id", application.id)
      .eq("status", "pending");

    const bookingTitle = job.title || "Job booking";
    const bookingMessage =
      application.cover_message ||
      `Booking created from accepted application for "${job.title || "Untitled job"}".`;

    const bookingBudget =
      application.proposed_rate ??
      job.budget_max ??
      job.budget_min ??
      workerProfile.hourly_rate ??
      null;

    const { data: booking, error: bookingError } = await adminSupabase
      .from("bookings")
      .insert({
        hirer_user_id: hirerProfile.user_id,
        worker_user_id: workerProfile.user_id,
        job_id: job.id,
        worker_profile_id: workerProfile.id,
        title: bookingTitle,
        message: bookingMessage,
        budget_amount: bookingBudget,
        currency_code: application.currency_code || job.currency_code || "GBP",
        start_date: application.start_date || null,
        location_type: job.location_type || "local",
        country: job.country || null,
        region: job.region || null,
        city: job.city || null,
        area_slug: job.area_slug || null,
        postcode: job.postcode_full || job.postcode || null,
        status: "accepted",
        seen_by_hirer: true,
        seen_by_worker: false,
        updated_at: now,
      })
      .select("id")
      .maybeSingle();

    if (bookingError) {
      return NextResponse.json(
        {
          error:
            bookingError.message ||
            "Application accepted but booking creation failed.",
        },
        { status: 400 }
      );
    }

    await adminSupabase
      .from("jobs")
      .update({
        status: "closed",
        visibility: "private",
        updated_at: now,
      })
      .eq("id", job.id);

    if (booking?.id) {
      await adminSupabase.from("messages").insert([
        {
          booking_id: booking.id,
          sender_id: hirerProfile.user_id,
          receiver_id: workerProfile.user_id,
          content: `Your application for "${job.title || "Untitled job"}" was accepted. A booking has been created.`,
          is_read: false,
          delivered: false,
        },
      ]);
    }

    await adminSupabase.from("notifications").insert([
      {
        user_id: workerProfile.user_id,
        type: "job_application_accepted",
        title: "Application accepted",
        body: `Your application for "${job.title || "Untitled job"}" was accepted.`,
        meta: {
          application_id: application.id,
          job_id: job.id,
          booking_id: booking?.id || null,
          status: "accepted",
          reviewed_at: now,
          hirer_user_id: hirerProfile.user_id,
          hirer_name: hirerName,
          job_title: job.title,
          job_location: jobLocation,
          worker_location: workerLocation,
        },
      },
      {
        user_id: hirerProfile.user_id,
        type: "job_application_status_changed",
        title: "Application accepted",
        body: `You accepted an application for "${job.title || "Untitled job"}".`,
        meta: {
          application_id: application.id,
          job_id: job.id,
          booking_id: booking?.id || null,
          status: "accepted",
          reviewed_at: now,
          worker_user_id: workerProfile.user_id,
          worker_profile_id: workerProfile.id,
        },
      },
    ]);

    const emailJobs = [];

    if (workerEmail) {
      emailJobs.push({
        kind: "application_accepted",
        userId: workerAccount?.id || workerProfile.user_id,
        toEmail: workerEmail,
        subject: "Your application was accepted",
        html: applicationAcceptedEmail({
          workerName,
          jobTitle: job.title || "Untitled job",
          location: jobLocation,
        }),
        meta: {
          application_id: application.id,
          job_id: job.id,
          booking_id: booking?.id || null,
          status: "accepted",
          job_title: job.title || "Untitled job",
          location: jobLocation,
        },
      });

      emailJobs.push({
        kind: "booking_accepted",
        userId: workerAccount?.id || workerProfile.user_id,
        toEmail: workerEmail,
        subject: "Booking accepted",
        html: bookingAcceptedEmail({
          userName: workerName,
          bookingTitle: bookingTitle,
          location: jobLocation,
        }),
        meta: {
          booking_id: booking?.id || null,
          job_id: job.id,
          booking_title: bookingTitle,
          location: jobLocation,
        },
      });
    }

    if (emailJobs.length > 0) {
      await enqueueEmails(emailJobs);
    }

    return NextResponse.json({
      success: true,
      status: "accepted",
      bookingId: booking?.id || null,
      message: "Application accepted successfully.",
    });
  } catch (error) {
    console.error("jobs/applications/update-status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error." },
      { status: 500 }
    );
  }
}