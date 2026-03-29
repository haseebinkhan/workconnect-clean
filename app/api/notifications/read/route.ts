import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, target } = body as {
      userId?: string;
      target?: "messages" | "applications";
    };

    if (!userId || !target) {
      return NextResponse.json({ success: false }, { status: 200 });
    }

    if (target === "messages") {
      const { data: myBookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("id")
        .or(`hirer_user_id.eq.${userId},worker_user_id.eq.${userId}`)
        .is("deleted_at", null);

      if (bookingsError) {
        console.error("Load bookings for message read error:", bookingsError);
      } else {
        const bookingIds = (myBookings || []).map((row) => row.id);

        if (bookingIds.length > 0) {
          const { error } = await supabase
            .from("messages")
            .update({ is_read: true })
            .in("booking_id", bookingIds)
            .neq("sender_id", userId)
            .eq("is_read", false);

          if (error) {
            console.error("Mark messages read error:", error);
          }
        }
      }
    }

    if (target === "applications") {
      const { data: hirerProfile, error: hirerProfileError } = await supabase
        .from("hirer_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (hirerProfileError) {
        console.error("Load hirer profile error:", hirerProfileError);
      } else if (hirerProfile?.id) {
        const { data: myJobs, error: myJobsError } = await supabase
          .from("jobs")
          .select("id")
          .eq("hirer_id", hirerProfile.id)
          .is("deleted_at", null);

        if (myJobsError) {
          console.error("Load hirer jobs error:", myJobsError);
        } else {
          const jobIds = (myJobs || []).map((j) => j.id);

          if (jobIds.length > 0) {
            const { error } = await supabase
              .from("job_applications")
              .update({ seen_by_hirer: true })
              .in("job_id", jobIds)
              .eq("seen_by_hirer", false);

            if (error) {
              console.error("Mark applications read error:", error);
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Notification read fatal error:", error);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}

