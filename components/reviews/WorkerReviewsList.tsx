"use client";

type Review = {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
};

export default function WorkerReviewsList({
  reviews,
}: {
  reviews: Review[];
}) {
  if (!reviews || reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">No reviews yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">
        Reviews ({reviews.length})
      </h3>

      <div className="space-y-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="rounded-xl border border-slate-100 bg-slate-50 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800">
                ⭐ {review.rating}/5
              </span>
              <span className="text-xs text-slate-500">
                {new Date(review.created_at).toLocaleDateString()}
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-600">
              {review.review_text || "No comment provided."}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

