import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await adminSupabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    const { data: myBookings, error: bookingsError } = await adminSupabase
      .from("bookings")
      .select("id")
      .or(`hirer_user_id.eq.${user.id},worker_user_id.eq.${user.id}`)
      .is("deleted_at", null);

    if (bookingsError) {
      return NextResponse.json(
        { error: bookingsError.message },
        { status: 400 }
      );
    }

    const bookingIds = (myBookings || []).map((row) => row.id);

    if (bookingIds.length > 0) {
      const { error: messagesError } = await adminSupabase
        .from("messages")
        .update({ is_read: true })
        .in("booking_id", bookingIds)
        .neq("sender_id", user.id)
        .eq("is_read", false);

      if (messagesError) {
        return NextResponse.json(
          { error: messagesError.message },
          { status: 400 }
        );
      }

      await adminSupabase
        .from("bookings")
        .update({ seen_by_worker: true })
        .eq("worker_user_id", user.id)
        .eq("status", "pending")
        .eq("seen_by_worker", false)
        .is("deleted_at", null);
    }

    const { data: hirerProfile, error: hirerProfileError } = await adminSupabase
      .from("hirer_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (hirerProfileError) {
      return NextResponse.json(
        { error: hirerProfileError.message },
        { status: 400 }
      );
    }

    if (hirerProfile?.id) {
      const { data: myJobs, error: myJobsError } = await adminSupabase
        .from("jobs")
        .select("id")
        .eq("hirer_id", hirerProfile.id)
        .is("deleted_at", null);

      if (myJobsError) {
        return NextResponse.json(
          { error: myJobsError.message },
          { status: 400 }
        );
      }

      const jobIds = (myJobs || []).map((job) => job.id);

      if (jobIds.length > 0) {
        const { error: applicationsError } = await adminSupabase
          .from("job_applications")
          .update({ seen_by_hirer: true })
          .in("job_id", jobIds)
          .eq("seen_by_hirer", false);

        if (applicationsError) {
          return NextResponse.json(
            { error: applicationsError.message },
            { status: 400 }
          );
        }
      }

      await adminSupabase
        .from("bookings")
        .update({ seen_by_hirer: true })
        .eq("hirer_user_id", user.id)
        .eq("seen_by_hirer", false)
        .is("deleted_at", null);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("read all notifications error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

