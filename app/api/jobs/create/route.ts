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

    const body = await req.json();

    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const description =
      typeof body?.description === "string" ? body.description.trim() : "";

    const country =
      typeof body?.country === "string" && body.country.trim()
        ? body.country.trim()
        : "United Kingdom";

    const region =
      typeof body?.region === "string" ? body.region.trim() : "";

    const city =
      typeof body?.city === "string" ? body.city.trim() : "";

    const postcode =
      typeof body?.postcode === "string"
        ? body.postcode.trim().toUpperCase()
        : "";

    const rawAreaSlug =
      typeof body?.areaSlug === "string" ? body.areaSlug.trim() : "";

    const areaSlug =
      rawAreaSlug || slugifyArea(city || region || "united-kingdom");

    const budgetMin =
      typeof body?.budgetMin === "number" ? body.budgetMin : null;

    const budgetMax =
      typeof body?.budgetMax === "number" ? body.budgetMax : null;

    const currencyCode =
      typeof body?.currencyCode === "string" && body.currencyCode.trim()
        ? body.currencyCode.trim().toUpperCase()
        : "GBP";

    const locationType =
      typeof body?.locationType === "string" && body.locationType.trim()
        ? body.locationType.trim()
        : "local";

    if (!title) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
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
        { error: "Region is required." },
        { status: 400 }
      );
    }

    if (!city) {
      return NextResponse.json(
        { error: "City is required." },
        { status: 400 }
      );
    }

    if (!postcode) {
      return NextResponse.json(
        { error: "Postcode is required." },
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
      .select("id, user_id, company_name, contact_name")
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

    const { data: createdJob, error: createError } = await adminSupabase
      .from("jobs")
      .insert({
        hirer_id: hirerProfile.id,
        title,
        description,
        area_slug: areaSlug,
        country,
        region,
        city,
        postcode,
        budget_min: budgetMin,
        budget_max: budgetMax,
        currency_code: currencyCode,
        location_type: locationType,
        status: "pending",
        visibility: "public",
        expires_at: expiresAt.toISOString(),
      })
      .select("id, title, status, expires_at")
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
            country,
            region,
            city,
            postcode,
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
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

