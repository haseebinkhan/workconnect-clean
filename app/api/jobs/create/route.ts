import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
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

    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const description =
      typeof body?.description === "string" ? body.description.trim() : "";
    const areaSlug =
      typeof body?.areaSlug === "string" ? body.areaSlug.trim() : "";
    const city = typeof body?.city === "string" ? body.city.trim() : "";
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

    if (!areaSlug) {
      return NextResponse.json(
        { error: "Area is required." },
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
        city: city || null,
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