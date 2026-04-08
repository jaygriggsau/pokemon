import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";

/** Orders you bought that are completed and not yet reviewed — for post-purchase prompts. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await sql`
    SELECT
      o.id AS order_id,
      o.completed_at,
      l.card_name,
      l.set_name,
      u.name AS seller_name
    FROM marketplace_orders o
    JOIN marketplace_listings l ON l.id = o.listing_id
    JOIN users u ON u.id = o.seller_id
    WHERE o.buyer_id = ${session.user.id}
      AND o.status = 'completed'
      AND NOT EXISTS (SELECT 1 FROM seller_reviews r WHERE r.order_id = o.id)
    ORDER BY o.completed_at DESC
    LIMIT 20
  `;

  return NextResponse.json({ pending: rows });
}
