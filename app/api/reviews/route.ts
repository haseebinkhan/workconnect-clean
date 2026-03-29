import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isValidRating(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
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

    const bookingId =
      typeof body?.bookingId === "string" ? body.bookingId.trim() : "";
    const comment =
      typeof body?.comment === "string" ? body.comment.trim() : "";
    const rating = body?.rating;

    if (!bookingId || !isValidRating(rating)) {
      return NextResponse.json(
        { error: "Booking and rating are required." },
        { status: 400 }
      );
    }

    const { data: booking, error: bookingError } = await adminSupabase
      .from("bookings")
      .select(`
        id,
        title,
        status,
        hirer_user_id,
        worker_user_id,
        worker_profile_id,
        deleted_at
      `)
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError || !booking || booking.deleted_at) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (booking.hirer_user_id !== user.id) {
      return NextResponse.json(
        { error: "Only the hirer can leave a review." },
        { status: 403 }
      );
    }

    if (booking.status !== "completed") {
      return NextResponse.json(
        { error: "Only completed bookings can be reviewed." },
        { status: 409 }
      );
    }

    const { data: existingReview } = await adminSupabase
      .from("reviews")
      .select("id")
      .eq("booking_id", booking.id)
      .maybeSingle();

    if (existingReview?.id) {
      return NextResponse.json(
        { error: "A review for this booking already exists." },
        { status: 409 }
      );
    }

    const { data: createdReview, error: reviewError } = await adminSupabase
      .from("reviews")
      .insert({
        booking_id: booking.id,
        reviewer_id: booking.hirer_user_id,
        reviewee_id: booking.worker_user_id,
        rating,
        comment: comment || null,
      })
      .select("id, rating, comment")
      .single();

    if (reviewError || !createdReview) {
      return NextResponse.json(
        { error: reviewError?.message || "Could not create review." },
        { status: 400 }
      );
    }

    const { data: workerReviews, error: reviewsReadError } = await adminSupabase
      .from("reviews")
      .select("rating")
      .eq("reviewee_id", booking.worker_user_id);

    if (reviewsReadError) {
      return NextResponse.json(
        { error: reviewsReadError.message },
        { status: 400 }
      );
    }

    const ratings = (workerReviews || [])
      .map((item) => Number(item.rating))
      .filter((item) => !Number.isNaN(item));

    const ratingCount = ratings.length;
    const ratingAvg =
      ratingCount > 0
        ? Number((ratings.reduce((sum, value) => sum + value, 0) / ratingCount).toFixed(2))
        : 0;

    if (booking.worker_profile_id) {
      const { data: completedBookings } = await adminSupabase
        .from("bookings")
        .select("id")
        .eq("worker_profile_id", booking.worker_profile_id)
        .eq("status", "completed")
        .is("deleted_at", null);

      await adminSupabase
        .from("worker_profiles")
        .update({
          rating_avg: ratingAvg,
          rating_count: ratingCount,
          jobs_completed: (completedBookings || []).length,
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.worker_profile_id);
    }

    await adminSupabase.from("notifications").insert({
      user_id: booking.worker_user_id,
      type: "new_review",
      title: "New review received",
      body: `You received a ${rating}-star review for "${booking.title}".`,
      meta: {
        booking_id: booking.id,
        review_id: createdReview.id,
        rating,
      },
    });

    return NextResponse.json({
      success: true,
      reviewId: createdReview.id,
      ratingAvg,
      ratingCount,
      message: "Review submitted successfully.",
    });
  } catch (error) {
    console.error("reviews/create error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

