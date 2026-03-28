import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ActionType = "accepted" | "rejected";

function normalizeAction(value: unknown): ActionType | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "accepted" || trimmed === "rejected") return trimmed;
  return null;
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const applicationId =
      typeof body?.applicationId === "string" ? body.applicationId.trim() : "";
    const action = normalizeAction(body?.action);

    if (!applicationId || !action) {
      return NextResponse.json(
        { error: "Missing applicationId or action." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const { data: hirerProfile, error: hirerProfileError } = await adminSupabase
      .from("hirer_profiles")
      .select("id, user_id, company_name, contact_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (hirerProfileError || !hirerProfile?.id) {
      return NextResponse.json(
        { error: "Hirer profile not found." },
        { status: 403 }
      );
    }

    const { data: application, error: applicationError } = await adminSupabase
      .from("job_applications")
      .select(`
        id,
        job_id,
        worker_id,
        status,
        cover_message,
        proposed_rate,
        currency_code,
        availability_type,
        start_date,
        phone,
        portfolio_url,
        linkedin_url,
        cv_url,
        created_at,
        updated_at
      `)
      .eq("id", applicationId)
      .maybeSingle();

    if (applicationError || !application) {
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404 }
      );
    }

    const { data: job, error: jobError } = await adminSupabase
      .from("jobs")
      .select(`
        id,
        hirer_id,
        title,
        description,
        status,
        visibility,
        city,
        area_slug,
        location_type,
        budget_min,
        budget_max,
        currency_code,
        deleted_at
      `)
      .eq("id", application.job_id)
      .maybeSingle();

    if (jobError || !job || job.deleted_at) {
      return NextResponse.json(
        { error: "Job not found." },
        { status: 404 }
      );
    }

    if (job.hirer_id !== hirerProfile.id) {
      return NextResponse.json(
        { error: "You are not allowed to update this application." },
        { status: 403 }
      );
    }

    if (application.status !== "pending") {
      return NextResponse.json(
        { error: "This application has already been processed." },
        { status: 409 }
      );
    }

    const { data: workerProfile, error: workerProfileError } = await adminSupabase
      .from("worker_profiles")
      .select(`
        id,
        user_id,
        headline,
        description,
        category,
        city,
        area_slug,
        hourly_rate,
        hourly_rate_min,
        hourly_rate_max,
        jobs_completed,
        rating_avg,
        rating_count
      `)
      .eq("id", application.worker_id)
      .maybeSingle();

    if (workerProfileError || !workerProfile?.user_id) {
      return NextResponse.json(
        { error: "Worker profile not found." },
        { status: 400 }
      );
    }

    if (action === "rejected") {
      const { data: updatedRejected, error: rejectError } = await adminSupabase
        .from("job_applications")
        .update({
          status: "rejected",
          seen_by_hirer: true,
          seen_by_worker: false,
          updated_at: now,
        })
        .eq("id", application.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

      if (rejectError) {
        return NextResponse.json(
          { error: rejectError.message },
          { status: 400 }
        );
      }

      if (!updatedRejected?.id) {
        return NextResponse.json(
          { error: "This application was already updated by another action." },
          { status: 409 }
        );
      }

      await adminSupabase.from("notifications").insert({
        user_id: workerProfile.user_id,
        type: "application_rejected",
        title: "Application rejected",
        body: `Your application for "${job.title}" was not accepted.`,
        meta: {
          job_id: job.id,
          application_id: application.id,
          job_title: job.title,
          updated_at: now,
        },
      });

      return NextResponse.json({
        success: true,
        status: "rejected",
        message: "Application rejected successfully.",
      });
    }

    if (job.status !== "open") {
      return NextResponse.json(
        { error: "This job is not open for acceptance." },
        { status: 400 }
      );
    }

    const { data: existingAccepted } = await adminSupabase
      .from("job_applications")
      .select("id")
      .eq("job_id", job.id)
      .eq("status", "accepted")
      .maybeSingle();

    if (existingAccepted?.id) {
      return NextResponse.json(
        { error: "Another worker has already been accepted for this job." },
        { status: 409 }
      );
    }

    const { data: existingBooking } = await adminSupabase
      .from("bookings")
      .select("id")
      .eq("job_id", job.id)
      .eq("worker_user_id", workerProfile.user_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingBooking?.id) {
      return NextResponse.json(
        {
          success: true,
          bookingId: existingBooking.id,
          status: "accepted",
          message: "Booking already exists for this worker.",
        },
        { status: 200 }
      );
    }

    const { data: acceptedApplication, error: acceptError } = await adminSupabase
      .from("job_applications")
      .update({
        status: "accepted",
        seen_by_hirer: true,
        seen_by_worker: false,
        updated_at: now,
      })
      .eq("id", application.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (acceptError) {
      return NextResponse.json(
        { error: acceptError.message },
        { status: 400 }
      );
    }

    if (!acceptedApplication?.id) {
      return NextResponse.json(
        { error: "This application was already updated by another action." },
        { status: 409 }
      );
    }

    const bookingMessageParts = [
      `Your application for "${job.title}" has been accepted.`,
      application.start_date ? `Preferred start date: ${application.start_date}.` : "",
      application.availability_type
        ? `Availability: ${application.availability_type}.`
        : "",
      application.proposed_rate != null
        ? `Agreed proposed rate: ${application.currency_code || job.currency_code || "GBP"} ${application.proposed_rate}.`
        : "",
      application.phone ? `Worker phone: ${application.phone}.` : "",
    ].filter(Boolean);

    const bookingTitle = job.title || "Accepted job";

    const bookingPayload = {
      job_id: job.id,
      hirer_user_id: user.id,
      worker_user_id: workerProfile.user_id,
      worker_profile_id: workerProfile.id,
      title: bookingTitle,
      message: bookingMessageParts.join(" "),
      status: "pending",
      budget_amount:
        application.proposed_rate ??
        job.budget_max ??
        job.budget_min ??
        null,
      currency_code:
        application.currency_code || job.currency_code || "GBP",
      city: job.city || workerProfile.city || null,
      area_slug: job.area_slug || workerProfile.area_slug || null,
      seen_by_hirer: true,
      seen_by_worker: false,
    };

    const { data: booking, error: bookingError } = await adminSupabase
      .from("bookings")
      .insert(bookingPayload)
      .select("id")
      .single();

    if (bookingError || !booking?.id) {
      await adminSupabase
        .from("job_applications")
        .update({
          status: "pending",
          seen_by_hirer: true,
          seen_by_worker: true,
          updated_at: now,
        })
        .eq("id", application.id);

      return NextResponse.json(
        { error: bookingError?.message || "Could not create booking." },
        { status: 400 }
      );
    }

    const messageTextParts = [
      `Hi, your application for "${job.title}" has been accepted.`,
      application.cover_message ? `Your application message: ${application.cover_message}` : "",
      application.proposed_rate != null
        ? `Proposed rate: ${application.currency_code || job.currency_code || "GBP"} ${application.proposed_rate}.`
        : "",
      application.start_date ? `Start date: ${application.start_date}.` : "",
      application.availability_type
        ? `Availability: ${application.availability_type}.`
        : "",
    ].filter(Boolean);

    const { error: messageError } = await adminSupabase.from("messages").insert({
      booking_id: booking.id,
      sender_user_id: user.id,
      receiver_user_id: workerProfile.user_id,
      content: messageTextParts.join(" "),
      message_type: "text",
      is_read: false,
      delivered_at: null,
      read_at: null,
      deleted_by_sender: false,
      deleted_by_receiver: false,
    });

    if (messageError) {
      console.error("initial booking message insert error:", messageError);
    }

    const { error: closeJobError } = await adminSupabase
      .from("jobs")
      .update({
        status: "closed",
        updated_at: now,
      })
      .eq("id", job.id);

    if (closeJobError) {
      console.error("job close error after acceptance:", closeJobError);
    }

    const { data: otherPendingApplications } = await adminSupabase
      .from("job_applications")
      .select("id, worker_id")
      .eq("job_id", job.id)
      .eq("status", "pending")
      .neq("id", application.id);

    if (otherPendingApplications && otherPendingApplications.length > 0) {
      const otherIds = otherPendingApplications.map((item) => item.id);

      const { error: rejectOthersError } = await adminSupabase
        .from("job_applications")
        .update({
          status: "rejected",
          seen_by_hirer: true,
          seen_by_worker: false,
          updated_at: now,
        })
        .in("id", otherIds);

      if (rejectOthersError) {
        console.error("reject other pending applications error:", rejectOthersError);
      }

      const otherWorkerIds = otherPendingApplications.map((item) => item.worker_id);

      const { data: otherWorkers } = await adminSupabase
        .from("worker_profiles")
        .select("id, user_id")
        .in("id", otherWorkerIds);

      if (otherWorkers && otherWorkers.length > 0) {
        const rejectionNotifications = otherWorkers
          .filter((item) => item.user_id)
          .map((item) => ({
            user_id: item.user_id,
            type: "application_rejected",
            title: "Application closed",
            body: `Your application for "${job.title}" was not selected because another worker has been accepted.`,
            meta: {
              job_id: job.id,
              accepted_application_id: application.id,
              updated_at: now,
            },
          }));

        if (rejectionNotifications.length > 0) {
          await adminSupabase.from("notifications").insert(rejectionNotifications);
        }
      }
    }

    await adminSupabase.from("notifications").insert([
      {
        user_id: workerProfile.user_id,
        type: "application_accepted",
        title: "Application accepted",
        body: `Your application for "${job.title}" has been accepted.`,
        meta: {
          job_id: job.id,
          application_id: application.id,
          booking_id: booking.id,
          updated_at: now,
        },
      },
      {
        user_id: user.id,
        type: "application_accepted_confirmation",
        title: "Worker accepted",
        body: `You accepted an applicant for "${job.title}".`,
        meta: {
          job_id: job.id,
          application_id: application.id,
          booking_id: booking.id,
          worker_user_id: workerProfile.user_id,
          updated_at: now,
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      status: "accepted",
      bookingId: booking.id,
      message: "Application accepted successfully.",
    });
  } catch (error) {
    console.error("update job application status error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Server error",
      },
      { status: 500 }
    );
  }
}
