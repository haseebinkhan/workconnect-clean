import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function slugifyArea(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeUpperText(value: unknown) {
  const text = normalizeText(value);
  return text ? text.toUpperCase() : "";
}

function isValidUKFullPostcode(value: string) {
  const text = value.trim().toUpperCase();
  if (!text) return true;
  return /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/.test(text);
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const category = normalizeText(body?.category);
    const title = normalizeText(body?.title);
    const titleSlug = normalizeText(body?.titleSlug);
    const description = normalizeText(body?.description);

    const country = normalizeText(body?.country) || "United Kingdom";
    const region = normalizeText(body?.region);
    const city = normalizeText(body?.city);

    const postcode = normalizeUpperText(body?.postcode);
    const postcodePrefix =
      normalizeUpperText(body?.postcodePrefix) || postcode || "";

    const postcodeFull = normalizeUpperText(body?.postcodeFull);

    const rawAreaSlug = normalizeText(body?.areaSlug);
    const areaSlug =
      rawAreaSlug || slugifyArea(city || region || "united-kingdom");

    const budgetMin =
      typeof body?.budgetMin === "number" ? body.budgetMin : null;

    const budgetMax =
      typeof body?.budgetMax === "number" ? body.budgetMax : null;

    const currencyCode =
      normalizeUpperText(body?.currencyCode) || "GBP";

    const locationType =
      normalizeText(body?.locationType) || "local";

    if (!category) {
      return NextResponse.json(
        { error: "Job category is required." },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: "Job title is required." },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        { error: "Description is required." },
        { status: 400 }
      );
    }

    if (!country) {
      return NextResponse.json(
        { error: "Country is required." },
        { status: 400 }
      );
    }

    if (!region) {
      return NextResponse.json(
        { error: "Nation or region is required." },
        { status: 400 }
      );
    }

    if (!city) {
      return NextResponse.json(
        { error: "City is required." },
        { status: 400 }
      );
    }

    if (!postcodePrefix) {
      return NextResponse.json(
        { error: "Postcode prefix is required." },
        { status: 400 }
      );
    }

    if (postcodeFull && !isValidUKFullPostcode(postcodeFull)) {
      return NextResponse.json(
        { error: "Full postcode is not valid." },
        { status: 400 }
      );
    }

    if (
      budgetMin != null &&
      Number.isNaN(Number(budgetMin))
    ) {
      return NextResponse.json(
        { error: "Minimum budget must be a valid number." },
        { status: 400 }
      );
    }

    if (
      budgetMax != null &&
      Number.isNaN(Number(budgetMax))
    ) {
      return NextResponse.json(
        { error: "Maximum budget must be a valid number." },
        { status: 400 }
      );
    }

    if (
      budgetMin != null &&
      budgetMax != null &&
      Number(budgetMin) > Number(budgetMax)
    ) {
      return NextResponse.json(
        { error: "Minimum budget cannot exceed maximum budget." },
        { status: 400 }
      );
    }

    const { data: hirerProfile, error: hirerProfileError } = await adminSupabase
      .from("hirer_profiles")
      .select("id, user_id, company_name, contact_name, industry")
      .eq("user_id", user.id)
      .maybeSingle();

    if (hirerProfileError || !hirerProfile?.id) {
      return NextResponse.json(
        { error: "Please complete your hirer profile first." },
        { status: 400 }
      );
    }

    const now = new Date();
    const expiresAt = addDays(now, 30);

    const finalPostcode =
      postcodeFull || postcodePrefix || null;

    const insertPayload: Record<string, unknown> = {
      hirer_id: hirerProfile.id,
      category,
      title,
      title_slug: titleSlug || null,
      description,
      area_slug: areaSlug,
      country,
      region,
      city,
      postcode: finalPostcode,
      postcode_prefix: postcodePrefix,
      postcode_full: postcodeFull || null,
      budget_min: budgetMin,
      budget_max: budgetMax,
      currency_code: currencyCode,
      location_type: locationType,
      status: "pending",
      visibility: "public",
      expires_at: expiresAt.toISOString(),
    };

    const { data: createdJob, error: createError } = await adminSupabase
      .from("jobs")
      .insert(insertPayload)
      .select(`
        id,
        title,
        status,
        expires_at,
        country,
        region,
        city,
        postcode,
        postcode_prefix,
        postcode_full
      `)
      .single();

    if (createError || !createdJob) {
      return NextResponse.json(
        { error: createError?.message || "Could not create job." },
        { status: 400 }
      );
    }

    const { data: admins } = await adminSupabase
      .from("profiles")
      .select("id")
      .or("is_admin.eq.true,role.eq.admin")
      .eq("is_active", true);

    if (admins && admins.length > 0) {
      await adminSupabase.from("notifications").insert(
        admins.map((admin) => ({
          user_id: admin.id,
          type: "job_submitted_for_review",
          title: "New job submitted",
          body: `"${createdJob.title}" has been submitted for review.`,
          meta: {
            job_id: createdJob.id,
            hirer_user_id: user.id,
            category,
            title,
            country,
            region,
            city,
            postcode: createdJob.postcode,
            postcode_prefix: createdJob.postcode_prefix,
            postcode_full: createdJob.postcode_full,
            area_slug: areaSlug,
            expires_at: createdJob.expires_at,
          },
        }))
      );
    }

    return NextResponse.json({
      success: true,
      message: "Job submitted for review successfully.",
      jobId: createdJob.id,
      expiresAt: createdJob.expires_at,
    });
  } catch (error) {
    console.error("jobs/create error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Server error",
      },
      { status: 500 }
    );
  }
}