import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { autoCloseExpiredJobs } from "@/lib/jobs/autoCloseExpiredJobs";
import { enqueueEmail } from "@/lib/email/queue";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const asDate = new Date(trimmed);
  if (Number.isNaN(asDate.getTime())) {
    return null;
  }

  return trimmed;
}

function buildLocationText({
  country,
  region,
  city,
  postcodePrefix,
  postcodeFull,
  areaSlug,
}: {
  country?: string | null;
  region?: string | null;
  city?: string | null;
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

  return base || areaSlug || "Location not specified";
}

function newApplicationReceivedEmail({
  hirerName,
  workerName,
  jobTitle,
  workerLocation,
  proposedRate,
  currencyCode,
  startDate,
}: {
  hirerName: string;
  workerName: string;
  jobTitle: string;
  workerLocation: string;
  proposedRate: number | null;
  currencyCode: string;
  startDate: string | null;
}) {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #0f172a; background: #f8fafc; padding: 24px;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="padding: 24px;">
          <h2 style="margin: 0 0 16px; color: #111827;">New application received</h2>

          <p style="margin: 0 0 12px;">Hi ${hirerName},</p>

          <p style="margin: 0 0 16px;">
            You received a new application for <strong>${jobTitle}</strong> on WorkConnect.
          </p>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px;"><strong>Worker:</strong> ${workerName}</p>
            <p style="margin: 0 0 8px;"><strong>Location:</strong> ${workerLocation}</p>
            ${
              proposedRate != null
                ? `<p style="margin: 0 0 8px;"><strong>Proposed rate:</strong> ${currencyCode} ${proposedRate}</p>`
                : ""
            }
            ${
              startDate
                ? `<p style="margin: 0;"><strong>Start date:</strong> ${startDate}</p>`
                : ""
            }
          </div>

          <a
            href="https://workconnect.uk/my-job-posts"
            style="display: inline-block; padding: 12px 18px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600;"
          >
            Review applications
          </a>

          <p style="margin-top: 24px; color: #475569;">WorkConnect Team</p>
        </div>
      </div>
    </div>
  `;
}

export async function POST(req: Request) {
  try {
    await autoCloseExpiredJobs();

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();

    const jobId = String(formData.get("jobId") || "").trim();
    const coverMessage = String(formData.get("coverMessage") || "").trim();
    const proposedRateRaw = String(formData.get("proposedRate") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const availabilityType = String(formData.get("availabilityType") || "").trim();
    const startDateRaw = String(formData.get("startDate") || "").trim();
    const portfolioUrl = String(formData.get("portfolioUrl") || "").trim();
    const linkedinUrl = String(formData.get("linkedinUrl") || "").trim();
    const cvFile = formData.get("cvFile") as File | null;

    if (!jobId) {
      return NextResponse.json({ error: "Missing job id." }, { status: 400 });
    }

    if (!coverMessage) {
      return NextResponse.json(
        { error: "Please enter a cover message." },
        { status: 400 }
      );
    }

    const proposedRate =
      proposedRateRaw === "" ? null : Number(proposedRateRaw);

    if (proposedRateRaw !== "" && Number.isNaN(proposedRate)) {
      return NextResponse.json(
        { error: "Proposed rate must be a valid number." },
        { status: 400 }
      );
    }

    const startDate = normalizeDate(startDateRaw);

    if (startDateRaw && !startDate) {
      return NextResponse.json(
        { error: "Please enter a valid start date." },
        { status: 400 }
      );
    }

    const { data: workerUserProfile, error: workerUserProfileError } =
      await adminSupabase
        .from("profiles")
        .select(
          "id, full_name, email, worker_enabled, is_active, country, region, city, postcode_prefix, postcode_full"
        )
        .eq("id", user.id)
        .maybeSingle();

    if (workerUserProfileError || !workerUserProfile) {
      return NextResponse.json(
        { error: "Your profile was not found." },
        { status: 404 }
      );
    }

    if (!workerUserProfile.is_active) {
      return NextResponse.json(
        { error: "Your account is not active." },
        { status: 403 }
      );
    }

    if (!workerUserProfile.worker_enabled) {
      return NextResponse.json(
        { error: "Enable worker mode before applying for jobs." },
        { status: 403 }
      );
    }

    const { data: workerProfile, error: workerProfileError } = await adminSupabase
      .from("worker_profiles")
      .select(
        "id, user_id, is_open_to_work, is_public, country, region, city, postcode, postcode_prefix, postcode_full, area_slug, category"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (workerProfileError || !workerProfile) {
      return NextResponse.json(
        {
          error:
            "Worker profile not found. Please complete your worker profile first.",
        },
        { status: 400 }
      );
    }

    if (!workerProfile.is_open_to_work) {
      return NextResponse.json(
        { error: "Your worker profile is not open to work." },
        { status: 400 }
      );
    }

    const { data: job, error: jobError } = await adminSupabase
      .from("jobs")
      .select(
        `
        id,
        hirer_id,
        title,
        status,
        visibility,
        deleted_at,
        country,
        region,
        city,
        postcode_prefix,
        postcode_full,
        area_slug,
        currency_code,
        budget_min,
        budget_max,
        expires_at
      `
      )
      .eq("id", jobId)
      .maybeSingle();

    if (jobError || !job || job.deleted_at) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    if (job.status !== "open") {
      return NextResponse.json(
        { error: "This job is not accepting applications." },
        { status: 400 }
      );
    }

    if (job.visibility !== "public") {
      return NextResponse.json(
        { error: "This job is not publicly available." },
        { status: 400 }
      );
    }

    if (job.expires_at) {
      const expiresAt = new Date(job.expires_at);
      if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now()) {
        return NextResponse.json(
          { error: "This job has expired." },
          { status: 400 }
        );
      }
    }

    const { data: hirerProfile, error: hirerProfileError } = await adminSupabase
      .from("hirer_profiles")
      .select("id, user_id, company_name, contact_name, location, industry")
      .eq("id", job.hirer_id)
      .maybeSingle();

    if (hirerProfileError || !hirerProfile) {
      return NextResponse.json(
        { error: "Hirer profile not found." },
        { status: 400 }
      );
    }

    if (hirerProfile.user_id === user.id) {
      return NextResponse.json(
        { error: "You cannot apply to your own job." },
        { status: 400 }
      );
    }

    const { data: hirerAccount } = await adminSupabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", hirerProfile.user_id)
      .maybeSingle();

    const { data: existing } = await adminSupabase
      .from("job_applications")
      .select("id, status")
      .eq("job_id", jobId)
      .eq("worker_id", workerProfile.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "You already applied for this job." },
        { status: 409 }
      );
    }

    let cvUrl: string | null = null;

    if (cvFile && cvFile.size > 0) {
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (!allowedTypes.includes(cvFile.type)) {
        return NextResponse.json(
          { error: "CV must be a PDF or Word document." },
          { status: 400 }
        );
      }

      const maxBytes = 5 * 1024 * 1024;
      if (cvFile.size > maxBytes) {
        return NextResponse.json(
          { error: "CV file must be smaller than 5MB." },
          { status: 400 }
        );
      }

      const fileExt = cvFile.name.split(".").pop() || "file";
      const safeName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `cv/${safeName}`;

      const { error: uploadError } = await adminSupabase.storage
        .from("cvs")
        .upload(filePath, cvFile, {
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json(
          { error: uploadError.message },
          { status: 400 }
        );
      }

      const { data } = adminSupabase.storage.from("cvs").getPublicUrl(filePath);
      cvUrl = data.publicUrl;
    }

    const insertPayload = {
      job_id: jobId,
      worker_id: workerProfile.id,
      cover_message: coverMessage || null,
      proposed_rate: proposedRate,
      phone: phone || null,
      availability_type: availabilityType || null,
      start_date: startDate,
      portfolio_url: portfolioUrl || null,
      linkedin_url: linkedinUrl || null,
      cv_url: cvUrl,
      status: "pending",
      seen_by_hirer: false,
      seen_by_worker: true,
    };

    const { data: insertedApplication, error: insertError } = await adminSupabase
      .from("job_applications")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertError || !insertedApplication) {
      console.error("job apply insert error:", insertError, insertPayload);

      return NextResponse.json(
        { error: insertError?.message || "Could not submit application." },
        { status: 400 }
      );
    }

    const workerLocation = buildLocationText({
      country: workerProfile.country,
      region: workerProfile.region,
      city: workerProfile.city,
      postcodePrefix: workerProfile.postcode_prefix,
      postcodeFull: workerProfile.postcode_full,
      areaSlug: workerProfile.area_slug,
    });

    const jobLocation = buildLocationText({
      country: job.country,
      region: job.region,
      city: job.city,
      postcodePrefix: job.postcode_prefix,
      postcodeFull: job.postcode_full,
      areaSlug: job.area_slug,
    });

    await adminSupabase.from("notifications").insert({
      user_id: hirerProfile.user_id,
      type: "job_application",
      title: "New application received",
      body: `A worker applied to "${job.title}".`,
      meta: {
        job_id: job.id,
        application_id: insertedApplication.id,
        worker_user_id: user.id,
        worker_profile_id: workerProfile.id,
        worker_name: workerUserProfile.full_name || "Worker",
        worker_category: workerProfile.category || null,
        worker_location: workerLocation,
        job_location: jobLocation,
        proposed_rate: proposedRate,
        currency_code: job.currency_code || "GBP",
        start_date: startDate,
      },
    });

    if (hirerAccount?.email) {
      const hirerName =
        hirerAccount.full_name ||
        hirerProfile.company_name ||
        hirerProfile.contact_name ||
        "there";

      await enqueueEmail([
        {
          userId: hirerAccount.id,
          toEmail: hirerAccount.email,
          subject: `New application for ${job.title || "your job"}`,
          html: newApplicationReceivedEmail({
            hirerName,
            workerName: workerUserProfile.full_name || "Worker",
            jobTitle: job.title || "Untitled job",
            workerLocation,
            proposedRate,
            currencyCode: job.currency_code || "GBP",
            startDate,
          }),
          meta: {
            application_id: insertedApplication.id,
            job_id: job.id,
            job_title: job.title || "Untitled job",
            worker_user_id: user.id,
            worker_profile_id: workerProfile.id,
          },
        },
      ]);
    }

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully",
      applicationId: insertedApplication.id,
    });
  } catch (error) {
    console.error("Apply job error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Server error",
      },
      { status: 500 }
    );
  }
}