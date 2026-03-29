import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

type MaybeError = { message: string } | null;

function throwIf(error: MaybeError, step: string) {
  if (error) {
    throw new Error(`${step}: ${error.message}`);
  }
}

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    const body = (await req.json()) as {
      targetUserId?: string;
    };

    const targetUserId = body.targetUserId?.trim();

    if (!targetUserId) {
      return NextResponse.json(
        { error: "Missing targetUserId" },
        { status: 400 }
      );
    }

    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from("profiles")
      .select("id, is_admin, role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    throwIf(adminError, "load admin profile");

    const isAdmin =
      !!adminProfile &&
      adminProfile.is_active === true &&
      (adminProfile.is_admin === true || adminProfile.role === "admin");

    if (!isAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (user.id === targetUserId) {
      return NextResponse.json(
        { error: "You cannot delete your own admin account" },
        { status: 400 }
      );
    }

    const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
      .from("profiles")
      .select("id, is_admin, role")
      .eq("id", targetUserId)
      .maybeSingle();

    throwIf(targetProfileError, "load target profile");

    if (!targetProfile) {
      return NextResponse.json({ success: true });
    }

    if (targetProfile.is_admin === true || targetProfile.role === "admin") {
      return NextResponse.json(
        { error: "Cannot delete another admin" },
        { status: 400 }
      );
    }

    const { data: workerProfile } = await supabaseAdmin
      .from("worker_profiles")
      .select("id")
      .eq("user_id", targetUserId)
      .maybeSingle();

    const { data: hirerProfile } = await supabaseAdmin
      .from("hirer_profiles")
      .select("id")
      .eq("user_id", targetUserId)
      .maybeSingle();

    const workerProfileId = workerProfile?.id ?? null;
    const hirerProfileId = hirerProfile?.id ?? null;

    let ownedJobIds: string[] = [];
    if (hirerProfileId) {
      const { data: jobs, error } = await supabaseAdmin
        .from("jobs")
        .select("id")
        .eq("hirer_id", hirerProfileId);
      throwIf(error, "load owned jobs");
      ownedJobIds = (jobs || []).map((j) => j.id);
    }

    const bookingFilters = [
      `hirer_user_id.eq.${targetUserId}`,
      `worker_user_id.eq.${targetUserId}`,
      workerProfileId ? `worker_profile_id.eq.${workerProfileId}` : null,
      ownedJobIds.length ? `job_id.in.(${ownedJobIds.join(",")})` : null,
    ].filter(Boolean) as string[];

    let bookingIds: string[] = [];
    if (bookingFilters.length) {
      const { data: bookings, error } = await supabaseAdmin
        .from("bookings")
        .select("id")
        .or(bookingFilters.join(","));
      throwIf(error, "load bookings");
      bookingIds = (bookings || []).map((b) => b.id);
    }

    const conversationFilters = [
      `created_by.eq.${targetUserId}`,
      bookingIds.length ? `booking_id.in.(${bookingIds.join(",")})` : null,
      ownedJobIds.length ? `job_id.in.(${ownedJobIds.join(",")})` : null,
    ].filter(Boolean) as string[];

    let conversationIds: string[] = [];
    if (conversationFilters.length) {
      const { data: conversations, error } = await supabaseAdmin
        .from("conversations")
        .select("id")
        .or(conversationFilters.join(","));
      throwIf(error, "load conversations");
      conversationIds = (conversations || []).map((c) => c.id);
    }

    {
      let error: MaybeError;

      ({ error } = await supabaseAdmin
        .from("conversation_participants")
        .delete()
        .eq("user_id", targetUserId));
      throwIf(error, "delete conversation_participants by user");

      ({ error } = await supabaseAdmin
        .from("booking_typing")
        .delete()
        .eq("user_id", targetUserId));
      throwIf(error, "delete booking_typing by user");

      ({ error } = await supabaseAdmin
        .from("deleted_chats")
        .delete()
        .eq("user_id", targetUserId));
      throwIf(error, "delete deleted_chats by user");

      ({ error } = await supabaseAdmin
        .from("favorites")
        .delete()
        .eq("user_id", targetUserId));
      throwIf(error, "delete favorites by user");

      ({ error } = await supabaseAdmin
        .from("favorites")
        .delete()
        .eq("worker_user_id", targetUserId));
      throwIf(error, "delete favorites by worker_user_id");

      ({ error } = await supabaseAdmin
        .from("notifications")
        .delete()
        .eq("user_id", targetUserId));
      throwIf(error, "delete notifications");

      ({ error } = await supabaseAdmin
        .from("reports")
        .delete()
        .eq("reporter_id", targetUserId));
      throwIf(error, "delete reports by reporter");

      ({ error } = await supabaseAdmin
        .from("reports")
        .delete()
        .eq("reported_user_id", targetUserId));
      throwIf(error, "delete reports by reported user");

      ({ error } = await supabaseAdmin
        .from("reviews")
        .delete()
        .eq("reviewer_id", targetUserId));
      throwIf(error, "delete reviews by reviewer");

      ({ error } = await supabaseAdmin
        .from("reviews")
        .delete()
        .eq("reviewee_id", targetUserId));
      throwIf(error, "delete reviews by reviewee");

      ({ error } = await supabaseAdmin
        .from("worker_reviews")
        .delete()
        .eq("hirer_user_id", targetUserId));
      throwIf(error, "delete worker_reviews by hirer");

      ({ error } = await supabaseAdmin
        .from("worker_reviews")
        .delete()
        .eq("worker_user_id", targetUserId));
      throwIf(error, "delete worker_reviews by worker");
    }

    if (conversationIds.length) {
      let error: MaybeError;

      ({ error } = await supabaseAdmin
        .from("conversation_participants")
        .delete()
        .in("conversation_id", conversationIds));
      throwIf(error, "delete conversation_participants by conversation");

      ({ error } = await supabaseAdmin
        .from("conversations")
        .delete()
        .in("id", conversationIds));
      throwIf(error, "delete conversations");
    }

    if (bookingIds.length) {
      let error: MaybeError;

      ({ error } = await supabaseAdmin
        .from("messages")
        .delete()
        .in("booking_id", bookingIds));
      throwIf(error, "delete messages");

      ({ error } = await supabaseAdmin
        .from("booking_messages")
        .delete()
        .in("booking_id", bookingIds));
      throwIf(error, "delete booking_messages");

      ({ error } = await supabaseAdmin
        .from("booking_typing")
        .delete()
        .in("booking_id", bookingIds));
      throwIf(error, "delete booking_typing by booking");

      ({ error } = await supabaseAdmin
        .from("deleted_chats")
        .delete()
        .in("booking_id", bookingIds));
      throwIf(error, "delete deleted_chats by booking");

      ({ error } = await supabaseAdmin
        .from("worker_reviews")
        .delete()
        .in("booking_id", bookingIds));
      throwIf(error, "delete worker_reviews by booking");

      ({ error } = await supabaseAdmin
        .from("reviews")
        .delete()
        .in("booking_id", bookingIds));
      throwIf(error, "delete reviews by booking");

      ({ error } = await supabaseAdmin
        .from("reports")
        .delete()
        .in("booking_id", bookingIds));
      throwIf(error, "delete reports by booking");

      ({ error } = await supabaseAdmin
        .from("bookings")
        .delete()
        .in("id", bookingIds));
      throwIf(error, "delete bookings");
    }

    if (workerProfileId) {
      let error: MaybeError;

      ({ error } = await supabaseAdmin
        .from("job_applications")
        .delete()
        .eq("worker_id", workerProfileId));
      throwIf(error, "delete job_applications by worker");

      ({ error } = await supabaseAdmin
        .from("worker_skill_map")
        .delete()
        .eq("worker_id", workerProfileId));
      throwIf(error, "delete worker_skill_map");

      ({ error } = await supabaseAdmin
        .from("worker_availability")
        .delete()
        .eq("worker_id", workerProfileId));
      throwIf(error, "delete worker_availability");

      ({ error } = await supabaseAdmin
        .from("worker_portfolio")
        .delete()
        .eq("worker_id", workerProfileId));
      throwIf(error, "delete worker_portfolio");

      ({ error } = await supabaseAdmin
        .from("worker_services")
        .delete()
        .eq("worker_id", workerProfileId));
      throwIf(error, "delete worker_services");

      ({ error } = await supabaseAdmin
        .from("worker_profiles")
        .delete()
        .eq("id", workerProfileId));
      throwIf(error, "delete worker_profile");
    }

    if (ownedJobIds.length) {
      let error: MaybeError;

      ({ error } = await supabaseAdmin
        .from("job_applications")
        .delete()
        .in("job_id", ownedJobIds));
      throwIf(error, "delete job_applications by owned jobs");

      ({ error } = await supabaseAdmin
        .from("applications")
        .delete()
        .in("job_id", ownedJobIds));
      throwIf(error, "delete applications by owned jobs");

      ({ error } = await supabaseAdmin
        .from("conversations")
        .delete()
        .in("job_id", ownedJobIds));
      throwIf(error, "delete conversations by owned jobs");

      ({ error } = await supabaseAdmin
        .from("jobs")
        .delete()
        .in("id", ownedJobIds));
      throwIf(error, "delete jobs");
    }

    if (hirerProfileId) {
      const { error } = await supabaseAdmin
        .from("hirer_profiles")
        .delete()
        .eq("id", hirerProfileId);
      throwIf(error, "delete hirer_profile");
    }

    {
      let error: MaybeError;

      ({ error } = await supabaseAdmin
        .from("applications")
        .delete()
        .eq("worker_user_id", targetUserId));
      throwIf(error, "delete applications by worker user");
    }

    {
      let error: MaybeError;

      ({ error } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", targetUserId));
      throwIf(error, "delete profile");
    }

    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(
      targetUserId
    );
    throwIf(authDeleteError, "delete auth user");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("admin delete user error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Server error",
      },
      { status: 500 }
    );
  }
}

