import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { autoCloseExpiredJobs } from "@/lib/jobs/autoCloseExpiredJobs";

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

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();

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

    const { data: workerProfile, error: workerProfileError } = await adminSupabase
      .from("worker_profiles")
      .select("id, user_id, is_open_to_work")
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
      .select("id, hirer_id, title, status, visibility, deleted_at")
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

    const { data: hirerProfile, error: hirerProfileError } = await adminSupabase
      .from("hirer_profiles")
      .select("id, user_id")
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
      const filePath = `cv/${user.id}-${Date.now()}.${fileExt}`;

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

    await adminSupabase.from("notifications").insert({
      user_id: hirerProfile.user_id,
      type: "job_application",
      title: "New application received",
      body: `A worker applied to "${job.title}".`,
      meta: {
        job_id: job.id,
        application_id: insertedApplication.id,
        worker_user_id: user.id,
      },
    });

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
