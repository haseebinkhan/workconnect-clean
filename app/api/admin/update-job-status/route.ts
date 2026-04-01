import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { enqueueEmail } from "@/lib/email/queue";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALLOWED_STATUSES = ["open", "paused", "rejected"] as const;
const NOTIFICATION_BATCH_SIZE = 500;

type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isAllowedStatus(value: string): value is AllowedStatus {
  return ALLOWED_STATUSES.includes(value as AllowedStatus);
}

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
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

function formatBudget({
  min,
  max,
  currencyCode,
}: {
  min?: number | null;
  max?: number | null;
  currencyCode?: string | null;
}) {
  const currency = currencyCode || "GBP";

  if (min != null && max != null) {
    return `${currency} ${min} - ${max}`;
  }

  if (min != null) {
    return `${currency} ${min}+`;
  }

  if (max != null) {
    return `Up to ${currency} ${max}`;
  }

  return "Budget not specified";
}

function emailShell(title: string, body: string) {
  return `
    <div style="font-family: Arial, sans-serif; background:#f8fafc; padding:24px;">
      <div style="max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">
        <div style="padding:24px;">
          <h2 style="margin:0 0 16px; color:#0f172a;">${title}</h2>
          <div style="color:#334155; font-size:15px; line-height:1.7;">
            ${body}
          </div>
          <p style="margin-top:24px; color:#64748b; font-size:13px;">
            WorkConnect
          </p>
        </div>
      </div>
    </div>
  `;
}

function jobApprovedEmail({
  hirerName,
  jobTitle,
}: {
  hirerName: string;
  jobTitle: string;
}) {
  return emailShell(
    "Your WorkConnect job is now live",
    `<p>Hi ${hirerName},</p>
     <p>Your job <strong>${jobTitle}</strong> has been approved and is now live on WorkConnect.</p>
     <p>Workers in the relevant area can now view it.</p>`
  );
}

function jobPausedEmail({
  hirerName,
  jobTitle,
  reason,
}: {
  hirerName: string;
  jobTitle: string;
  reason: string;
}) {
  return emailShell(
    "Your WorkConnect job has been paused",
    `<p>Hi ${hirerName},</p>
     <p>Your job <strong>${jobTitle}</strong> has been paused.</p>
     <p><strong>Reason:</strong> ${reason}</p>`
  );
}

function jobRejectedEmail({
  hirerName,
  jobTitle,
  reason,
}: {
  hirerName: string;
  jobTitle: string;
  reason: string;
}) {
  return emailShell(
    "Your WorkConnect job was not approved",
    `<p>Hi ${hirerName},</p>
     <p>Your job <strong>${jobTitle}</strong> was not approved.</p>
     <p><strong>Reason:</strong> ${reason}</p>`
  );
}

function newRegionalJobEmail({
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
  return emailShell(
    "New WorkConnect job in your area",
    `<p>Hi ${userName},</p>
     <p>A new job is now live in your area.</p>
     <p><strong>Title:</strong> ${jobTitle}</p>
     <p><strong>Category:</strong> ${category}</p>
     <p><strong>Location:</strong> ${location}</p>
     <p><strong>Budget:</strong> ${budget}</p>`
  );
}

async function queueSingleEmail(job: {
  kind: string;
  userId?: string;
  toEmail: string;
  subject: string;
  html: string;
  meta?: Record<string, unknown>;
}) {
  await enqueueEmail({
    userId: job.userId,
    toEmail: job.toEmail,
    subject: job.subject,
    html: job.html,
    meta: job.meta,
  });
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
        budget_min,
        budget_max,
        currency_code,
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

    const budgetText = formatBudget({
      min: job.budget_min,
      max: job.budget_max,
      currencyCode: job.currency_code,
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
          await queueSingleEmail({
            kind: "job_approved",
            userId: hirerAccount.id,
            toEmail: hirerAccount.email,
            subject: "Your WorkConnect job is now live",
            html: jobApprovedEmail({
              hirerName,
              jobTitle: job.title || "Untitled job",
            }),
            meta: {
              job_id: job.id,
              job_title: job.title || "Untitled job",
              status: "open",
            },
          });
        }

        if (status === "paused") {
          await queueSingleEmail({
            kind: "job_paused",
            userId: hirerAccount.id,
            toEmail: hirerAccount.email,
            subject: "Your WorkConnect job has been paused",
            html: jobPausedEmail({
              hirerName,
              jobTitle: job.title || "Untitled job",
              reason: reason || "Please review your job post.",
            }),
            meta: {
              job_id: job.id,
              job_title: job.title || "Untitled job",
              status: "paused",
              reason: reason || "Please review your job post.",
            },
          });
        }

        if (status === "rejected") {
          await queueSingleEmail({
            kind: "job_rejected",
            userId: hirerAccount.id,
            toEmail: hirerAccount.email,
            subject: "Your WorkConnect job was not approved",
            html: jobRejectedEmail({
              hirerName,
              jobTitle: job.title || "Untitled job",
              reason: reason || "Please review your job post.",
            }),
            meta: {
              job_id: job.id,
              job_title: job.title || "Untitled job",
              status: "rejected",
              reason: reason || "Please review your job post.",
            },
          });
        }
      }
    }

    if (status === "open" && job.region) {
      const { data: matchedUsers } = await adminSupabase
        .from("profiles")
        .select("id, full_name, email, is_active, deleted_at, region")
        .eq("region", job.region)
        .eq("is_active", true)
        .is("deleted_at", null);

      const uniqueAudienceMap = new Map<
        string,
        { id: string; full_name: string | null; email: string }
      >();

      for (const item of matchedUsers || []) {
        if (!item || item.id === hirerProfile?.user_id) continue;

        const email = normalizeEmail(item.email);
        if (!email) continue;

        if (!uniqueAudienceMap.has(email)) {
          uniqueAudienceMap.set(email, {
            id: item.id,
            full_name: item.full_name,
            email,
          });
        }
      }

      const audience = Array.from(uniqueAudienceMap.values());

      if (audience.length > 0) {
        const notificationRows = audience.map((item) => ({
          user_id: item.id,
          type: "new_job_in_area",
          title: "New job in your area",
          body: `"${job.title || "Untitled job"}" is now live in ${job.region}.`,
          meta: {
            job_id: job.id,
            title: job.title,
            category: job.category,
            region: job.region,
            location: locationText,
            budget: budgetText,
            created_at: now,
          },
        }));

        for (const batch of chunkArray(
          notificationRows,
          NOTIFICATION_BATCH_SIZE
        )) {
          await adminSupabase.from("notifications").insert(batch);
        }

        for (const item of audience) {
          await queueSingleEmail({
            kind: "new_job_in_area",
            userId: item.id,
            toEmail: item.email,
            subject: `New WorkConnect job in ${job.region}`,
            html: newRegionalJobEmail({
              userName: item.full_name || "there",
              jobTitle: job.title || "Untitled job",
              category: job.category || "General",
              location: locationText,
              budget: budgetText,
            }),
            meta: {
              job_id: job.id,
              region: job.region,
              category: job.category || "General",
              location: locationText,
              budget: budgetText,
            },
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