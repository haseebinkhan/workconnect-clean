import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Json = Record<string, unknown>;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      adminUserId?: string;
      targetUserId?: string;
    };

    const adminUserId = body.adminUserId;
    const targetUserId = body.targetUserId;

    if (!adminUserId || !targetUserId) {
      return NextResponse.json(
        { error: "Missing adminUserId or targetUserId" },
        { status: 400 }
      );
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Missing Supabase environment variables" },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1) Verify admin
    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from("profiles")
      .select("id, is_admin, role")
      .eq("id", adminUserId)
      .single();

    if (
      adminError ||
      !adminProfile ||
      (!adminProfile.is_admin && adminProfile.role !== "admin")
    ) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (adminUserId === targetUserId) {
      return NextResponse.json(
        { error: "You cannot delete your own admin account" },
        { status: 400 }
      );
    }

    // 2) Load worker/hirer profile ids for this user
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

    // 3) Load owned job ids
    let ownedJobIds: string[] = [];
    if (hirerProfileId) {
      const { data: jobs } = await supabaseAdmin
        .from("jobs")
        .select("id")
        .eq("hirer_id", hirerProfileId);

      ownedJobIds = (jobs || []).map((j) => j.id);
    }

    // 4) Load related booking ids
    const { data: bookingRows } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .or(
        [
          `hirer_user_id.eq.${targetUserId}`,
          `worker_user_id.eq.${targetUserId}`,
          workerProfileId ? `worker_profile_id.eq.${workerProfileId}` : null,
          ownedJobIds.length > 0 ? `job_id.in.(${ownedJobIds.join(",")})` : null,
        ]
          .filter(Boolean)
          .join(",")
      );

    const bookingIds = (bookingRows || []).map((b) => b.id);

    // 5) Load conversation ids
    const conversationFilters = [
      `created_by.eq.${targetUserId}`,
      bookingIds.length > 0 ? `booking_id.in.(${bookingIds.join(",")})` : null,
      ownedJobIds.length > 0 ? `job_id.in.(${ownedJobIds.join(",")})` : null,
    ]
      .filter(Boolean)
      .join(",");

    let conversationIds: string[] = [];
    if (conversationFilters) {
      const { data: conversations } = await supabaseAdmin
        .from("conversations")
        .select("id")
        .or(conversationFilters);

      conversationIds = (conversations || []).map((c) => c.id);
    }

    // Helper to stop on DB error
    const failIfError = (error: { message: string } | null, label: string) => {
      if (error) {
        throw new Error(`${label}: ${error.message}`);
      }
    };

    // =========================================================
    // DELETE IN SAFE ORDER
    // =========================================================

    // A) Things tied directly to auth.users
    {
      const { error } = await supabaseAdmin
        .from("booking_messages")
        .delete()
        .eq("sender_user_id", targetUserId);
      failIfError(error, "booking_messages delete");
    }

    // B) Conversation children first
    if (conversationIds.length > 0) {
      const { error } = await supabaseAdmin
        .from("conversation_participants")
        .delete()
        .in("conversation_id", conversationIds);
      failIfError(error, "conversation_participants delete");
    }

    // C) Booking children
    if (bookingIds.length > 0) {
      let error;

      ({ error } = await supabaseAdmin
        .from("messages")
        .delete()
        .in("booking_id", bookingIds));
      failIfError(error, "messages delete");

      ({ error } = await supabaseAdmin
        .from("deleted_chats")
        .delete()
        .in("booking_id", bookingIds));
      failIfError(error, "deleted_chats by booking delete");

      ({ error } = await supabaseAdmin
        .from("booking_typing")
        .delete()
        .in("booking_id", bookingIds));
      failIfError(error, "booking_typing delete");

      ({ error } = await supabaseAdmin
        .from("reports")
        .delete()
        .in("booking_id", bookingIds));
      failIfError(error, "reports by booking delete");

      ({ error } = await supabaseAdmin
        .from("reviews")
        .delete()
        .in("booking_id", bookingIds));
      failIfError(error, "reviews by booking delete");

      ({ error } = await supabaseAdmin
        .from("worker_reviews")
        .delete()
        .in("booking_id", bookingIds));
      failIfError(error, "worker_reviews by booking delete");
    }

    // D) Jobs children
    if (ownedJobIds.length > 0) {
      let error;

      ({ error } = await supabaseAdmin
        .from("applications")
        .delete()
        .in("job_id", ownedJobIds));
      failIfError(error, "applications by job delete");

      ({ error } = await supabaseAdmin
        .from("job_applications")
        .delete()
        .in("job_id", ownedJobIds));
      failIfError(error, "job_applications by job delete");
    }

    // E) User-linked rows
    {
      let error;

      ({ error } = await supabaseAdmin
        .from("applications")
        .delete()
        .eq("worker_user_id", targetUserId));
      failIfError(error, "applications by worker_user_id delete");

      ({ error } = await supabaseAdmin
        .from("notifications")
        .delete()
        .eq("user_id", targetUserId));
      failIfError(error, "notifications delete");

      ({ error } = await supabaseAdmin
        .from("favorites")
        .delete()
        .eq("user_id", targetUserId));
      failIfError(error, "favorites by user_id delete");

      ({ error } = await supabaseAdmin
        .from("favorites")
        .delete()
        .eq("worker_user_id", targetUserId));
      failIfError(error, "favorites by worker_user_id delete");

      ({ error } = await supabaseAdmin
        .from("reports")
        .delete()
        .eq("reporter_id", targetUserId));
      failIfError(error, "reports by reporter_id delete");

      ({ error } = await supabaseAdmin
        .from("reports")
        .delete()
        .eq("reported_user_id", targetUserId));
      failIfError(error, "reports by reported_user_id delete");

      ({ error } = await supabaseAdmin
        .from("reviews")
        .delete()
        .eq("reviewer_id", targetUserId));
      failIfError(error, "reviews by reviewer_id delete");

      ({ error } = await supabaseAdmin
        .from("reviews")
        .delete()
        .eq("reviewee_id", targetUserId));
      failIfError(error, "reviews by reviewee_id delete");

      ({ error } = await supabaseAdmin
        .from("worker_reviews")
        .delete()
        .eq("hirer_user_id", targetUserId));
      failIfError(error, "worker_reviews by hirer_user_id delete");

      ({ error } = await supabaseAdmin
        .from("worker_reviews")
        .delete()
        .eq("worker_user_id", targetUserId));
      failIfError(error, "worker_reviews by worker_user_id delete");

      ({ error } = await supabaseAdmin
        .from("deleted_chats")
        .delete()
        .eq("user_id", targetUserId));
      failIfError(error, "deleted_chats by user_id delete");
    }

    // F) Worker-profile children
    if (workerProfileId) {
      let error;

      ({ error } = await supabaseAdmin
        .from("worker_skill_map")
        .delete()
        .eq("worker_id", workerProfileId));
      failIfError(error, "worker_skill_map delete");

      ({ error } = await supabaseAdmin
        .from("worker_availability")
        .delete()
        .eq("worker_id", workerProfileId));
      failIfError(error, "worker_availability delete");

      ({ error } = await supabaseAdmin
        .from("worker_portfolio")
        .delete()
        .eq("worker_id", workerProfileId));
      failIfError(error, "worker_portfolio delete");

      ({ error } = await supabaseAdmin
        .from("job_applications")
        .delete()
        .eq("worker_id", workerProfileId));
      failIfError(error, "job_applications by worker_id delete");

      ({ error } = await supabaseAdmin
        .from("bookings")
        .delete()
        .eq("worker_profile_id", workerProfileId));
      failIfError(error, "bookings by worker_profile_id delete");

      ({ error } = await supabaseAdmin
        .from("worker_services")
        .delete()
        .eq("worker_id", workerProfileId));
      failIfError(error, "worker_services delete");
    }

    // G) Conversations now
    if (conversationIds.length > 0) {
      const { error } = await supabaseAdmin
        .from("conversations")
        .delete()
        .in("id", conversationIds);
      failIfError(error, "conversations delete");
    }

    // H) Bookings now
    {
      let error;

      ({ error } = await supabaseAdmin
        .from("bookings")
        .delete()
        .eq("hirer_user_id", targetUserId));
      failIfError(error, "bookings by hirer_user_id delete");

      ({ error } = await supabaseAdmin
        .from("bookings")
        .delete()
        .eq("worker_user_id", targetUserId));
      failIfError(error, "bookings by worker_user_id delete");
    }

    // I) Jobs now
    if (hirerProfileId) {
      const { error } = await supabaseAdmin
        .from("jobs")
        .delete()
        .eq("hirer_id", hirerProfileId);
      failIfError(error, "jobs delete");
    }

    // J) Profile wrappers
    if (workerProfileId) {
      const { error } = await supabaseAdmin
        .from("worker_profiles")
        .delete()
        .eq("id", workerProfileId);
      failIfError(error, "worker_profiles delete");
    }

    if (hirerProfileId) {
      const { error } = await supabaseAdmin
        .from("hirer_profiles")
        .delete()
        .eq("id", hirerProfileId);
      failIfError(error, "hirer_profiles delete");
    }

    // K) Profile itself
    {
      const { error } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", targetUserId);
      failIfError(error, "profiles delete");
    }

    // L) Finally auth user
    {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
      failIfError(error, "auth.users delete");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Server error deleting user";

    console.error("admin delete-user error:", error);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}