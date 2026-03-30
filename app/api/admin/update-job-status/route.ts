import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";
import {
  jobApprovedEmail,
  jobPausedEmail,
  jobRejectedEmail,
} from "@/lib/email/templates";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALLOWED_STATUSES = ["open", "paused", "rejected"] as const;

type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isAllowedStatus(value: string): value is AllowedStatus {
  return ALLOWED_STATUSES.includes(value as AllowedStatus);
}

function buildLocationText({
  country,
  region,
  city,
  postcodePrefix,
  postcodeFull,
  postcode,
  areaSlug,
}: {
  country?: string | null;
  region?: string | null;
  city?: string | null;
  postcodePrefix?: string | null;
  postcodeFull?: string | null;
  postcode?: string | null;
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

function buildExpiry(daysFromNow: number) {
  const next = new Date();
  next.setDate(next.getDate() + daysFromNow);
  return next.toISOString();
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile, error: adminError } = await adminSupabase
      .from("profiles")
      .select("id, is_admin, role, is_active, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (adminError || !adminProfile) {
      return NextResponse.json(
        { error: "Admin profile not found" },
        { status: 403 }
      );
    }

    const isAdmin =
      adminProfile.is_active === true &&
      (adminProfile.is_admin === true || adminProfile.role === "admin");

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    const jobId = normalizeText(body?.jobId);
    const status = normalizeText(body?.status).toLowerCase();
    const reason = normalizeText(body?.reason);

    if (!jobId || !status) {
      return NextResponse.json(
        { error: "Missing jobId or status" },
        { status: 400 }
      );
    }

    if (!isAllowedStatus(status)) {
      return NextResponse.json(
        { error: "Invalid job status" },
        { status: 400 }
      );
    }

    if ((status === "paused" || status === "rejected") && reason.length < 5) {
      return NextResponse.json(
        { error: "A short reason is required for paused or rejected jobs." },
        { status: 400 }
      );
    }

    const { data: job, error: jobError } = await adminSupabase
      .from("jobs")
      .select(`
        id,
        title,
        category,
        hirer_id,
        status,
        visibility,
        country,
        region,
        city,
        postcode,
        postcode_prefix,
        postcode_full,
        area_slug,
        deleted_at,
        expires_at
      `)
      .eq("id", jobId)
      .maybeSingle();

    if (jobError || !job || job.deleted_at) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const nextVisibility = status === "open" ? "public" : "private";

    let nextExpiresAt = job.expires_at;
    if (status === "open" && !nextExpiresAt) {
      nextExpiresAt = buildExpiry(30);
    }

    if (job.status === status && (job.visibility || null) === nextVisibility) {
      return NextResponse.json({
        success: true,
        message: "No change needed",
        jobId: job.id,
        status,
        visibility: nextVisibility,
      });
    }

    const now = new Date().toISOString();

    const updatePayload: Record<string, unknown> = {
      status,
      visibility: nextVisibility,
      deleted_at: null,
      updated_at: now,
    };

    if (status === "open") {
      updatePayload.expires_at = nextExpiresAt;
    }

    const { error: updateError } = await adminSupabase
      .from("jobs")
      .update(updatePayload)
      .eq("id", jobId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    const { data: hirerProfile } = await adminSupabase
      .from("hirer_profiles")
      .select("id, user_id, company_name, contact_name")
      .eq("id", job.hirer_id)
      .maybeSingle();

    const { data: hirerAccount } = hirerProfile?.user_id
      ? await adminSupabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("id", hirerProfile.user_id)
          .maybeSingle()
      : { data: null };

    const locationText = buildLocationText({
      country: job.country,
      region: job.region,
      city: job.city,
      postcodePrefix: job.postcode_prefix,
      postcodeFull: job.postcode_full,
      postcode: job.postcode,
      areaSlug: job.area_slug,
    });

    if (hirerProfile?.user_id) {
      const notificationTitle =
        status === "open"
          ? "Job approved"
          : status === "paused"
          ? "Job paused"
          : "Job rejected";

      const notificationBody =
        status === "open"
          ? `Your job "${job.title || "Untitled job"}" is now live and visible to workers.`
          : status === "paused"
          ? `Your job "${job.title || "Untitled job"}" has been paused by admin.`
          : `Your job "${job.title || "Untitled job"}" was rejected and is not visible to workers.`;

      await adminSupabase.from("notifications").insert({
        user_id: hirerProfile.user_id,
        type: "job_status_updated",
        title: notificationTitle,
        body: notificationBody,
        meta: {
          job_id: job.id,
          title: job.title,
          category: job.category,
          status,
          visibility: nextVisibility,
          reviewed_by: user.id,
          reviewed_by_name: adminProfile.full_name || "Admin",
          review_reason: reason || null,
          reviewed_at: now,
          expires_at: status === "open" ? nextExpiresAt : null,
          location: locationText,
          postcode_prefix: job.postcode_prefix || null,
          postcode_full: job.postcode_full || null,
        },
      });

      if (hirerAccount?.email) {
        const hirerName =
          hirerAccount.full_name ||
          hirerProfile.company_name ||
          hirerProfile.contact_name ||
          "there";

        if (status === "open") {
          await sendEmail({
            to: hirerAccount.email,
            subject: "Your WorkConnect job is now live",
            html: jobApprovedEmail({
              hirerName,
              jobTitle: job.title || "Untitled job",
            }),
          });
        }

        if (status === "paused") {
          await sendEmail({
            to: hirerAccount.email,
            subject: "Your WorkConnect job has been paused",
            html: jobPausedEmail({
              hirerName,
              jobTitle: job.title || "Untitled job",
              reason: reason || "Please review your job post.",
            }),
          });
        }

        if (status === "rejected") {
          await sendEmail({
            to: hirerAccount.email,
            subject: "Your WorkConnect job was not approved",
            html: jobRejectedEmail({
              hirerName,
              jobTitle: job.title || "Untitled job",
              reason: reason || "Please review your job post.",
            }),
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status,
      visibility: nextVisibility,
      expiresAt: status === "open" ? nextExpiresAt : null,
      reason: reason || null,
      message:
        status === "open"
          ? "Job approved successfully."
          : status === "paused"
          ? "Job paused successfully."
          : "Job rejected successfully.",
    });
  } catch (error) {
    console.error("admin update job status error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Server error",
      },
      { status: 500 }
    );
  }
}