"use client";

import type { PublicSellerReview } from "@/lib/seller-reviews-types";
import { formatDate } from "@/lib/format-date";

function StarRow({ rating }: { rating: number }) {
  const n = Math.min(5, Math.max(1, Math.round(rating)));
  return (
    <span className="text-sm tracking-tight" style={{ color: "var(--yellow)" }} aria-hidden>
      {"★".repeat(n)}
      <span style={{ color: "var(--muted)", opacity: 0.45 }}>{"★".repeat(5 - n)}</span>
    </span>
  );
}


export function SellerReviewsSection({
  reviews,
  heading = "Buyer reviews",
}: {
  reviews: PublicSellerReview[];
  heading?: string;
}) {
  return (
    <section
      id="seller-reviews"
      className="rounded-xl p-4 sm:p-5 flex flex-col gap-4 scroll-mt-24"
      style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
      aria-labelledby="seller-reviews-heading"
    >
      <div className="flex flex-col gap-1">
        <h2 id="seller-reviews-heading" className="text-base font-bold">
          {heading}
        </h2>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          From verified purchases on this marketplace. Comments are optional.
        </p>
      </div>

      {reviews.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No reviews yet — ratings appear here after buyers complete a purchase.
        </p>
      ) : (
        <ul className="flex flex-col gap-4 list-none m-0 p-0">
          {reviews.map((r, i) => (
            <li
              key={`${r.created_at}-${i}`}
              className="pb-4 border-b last:border-0 last:pb-0"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <StarRow rating={r.rating} />
                <span className="sr-only">{r.rating} out of 5 stars</span>
                <span className="text-sm font-medium">{r.reviewer_display}</span>
                {formatDate(r.created_at) && (
                  <span className="text-xs" style={{ color: "var(--muted)" }}>
                    · {formatDate(r.created_at)}
                  </span>
                )}
              </div>
              {r.comment && (
                <p className="text-sm mt-2 whitespace-pre-wrap" style={{ color: "var(--text)" }}>
                  {r.comment}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
