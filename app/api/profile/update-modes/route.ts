import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const supabase = createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const workerEnabled = Boolean(body?.workerEnabled);
    const hirerEnabled = Boolean(body?.hirerEnabled);

    const { data: existingProfile, error: existingProfileError } = await adminSupabase
      .from("profiles")
      .select("id, full_name, is_active, city, area_slug")
      .eq("id", user.id)
      .maybeSingle();

    if (existingProfileError || !existingProfile) {
      return NextResponse.json(
        { error: "Profile not found." },
        { status: 404 }
      );
    }

    if (!existingProfile.is_active) {
      return NextResponse.json(
        { error: "Your account is not active." },
        { status: 403 }
      );
    }

    const { error: updateProfileError } = await adminSupabase
      .from("profiles")
      .update({
        worker_enabled: workerEnabled,
        hirer_enabled: hirerEnabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateProfileError) {
      return NextResponse.json(
        { error: updateProfileError.message },
        { status: 400 }
      );
    }

    if (workerEnabled) {
      const { data: workerProfile } = await adminSupabase
        .from("worker_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!workerProfile?.id) {
        const { error: createWorkerProfileError } = await adminSupabase
          .from("worker_profiles")
          .insert({
            user_id: user.id,
            headline: null,
            description: null,
            experience_years: 0,
            hourly_rate: null,
            currency_code: "GBP",
            available_for_remote: false,
            available_for_local: true,
            response_time: null,
            is_open_to_work: true,
            is_featured: false,
            area_slug: existingProfile.area_slug || "belfast",
            city: existingProfile.city || null,
          });

        if (createWorkerProfileError) {
          return NextResponse.json(
            { error: createWorkerProfileError.message },
            { status: 400 }
          );
        }
      }
    }

    if (hirerEnabled) {
      const { data: hirerProfile } = await adminSupabase
        .from("hirer_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!hirerProfile?.id) {
        const { error: createHirerProfileError } = await adminSupabase
          .from("hirer_profiles")
          .insert({
            user_id: user.id,
            company_name: null,
            company_website: null,
            company_size: null,
            about: null,
            area_slug: existingProfile.area_slug || "belfast",
            city: existingProfile.city || null,
            contact_name: existingProfile.full_name || null,
            hirer_type: null,
            industry: null,
            website: null,
            description: null,
          });

        if (createHirerProfileError) {
          return NextResponse.json(
            { error: createHirerProfileError.message },
            { status: 400 }
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      workerEnabled,
      hirerEnabled,
    });
  } catch (error) {
    console.error("update modes error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
