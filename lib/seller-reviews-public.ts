import { sql } from "@/lib/db";
import type { PublicSellerReview } from "./seller-reviews-types";

export type { PublicSellerReview } from "./seller-reviews-types";

export async function getPublicSellerReviews(
  sellerId: string,
  limit = 20
): Promise<PublicSellerReview[]> {
  const capped = Math.min(Math.max(Math.floor(limit), 1), 50);
  const rows = await sql`
    SELECT
      sr.rating,
      sr.comment,
      sr.created_at::text AS created_at,
      CASE
        WHEN NULLIF(TRIM(ru.name), '') IS NULL THEN 'Verified buyer'
        ELSE SPLIT_PART(TRIM(ru.name), ' ', 1)
      END AS reviewer_display
    FROM seller_reviews sr
    LEFT JOIN users ru ON ru.id = sr.reviewer_id
    WHERE sr.seller_id = ${sellerId}
    ORDER BY sr.created_at DESC
    LIMIT ${capped}
  `;
  return rows as PublicSellerReview[];
}
