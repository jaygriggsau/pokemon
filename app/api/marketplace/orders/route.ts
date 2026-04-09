import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uid = session.user.id;

  const purchases = await sql`
    SELECT
      o.id,
      o.listing_id,
      o.price_cents,
      o.postage_cents,
      o.currency,
      o.completed_at,
      l.card_id,
      l.card_name,
      l.set_name,
      seller.name AS counterparty_name,
      (r.id IS NOT NULL) AS has_review
    FROM marketplace_orders o
    JOIN marketplace_listings l ON l.id = o.listing_id
    JOIN users seller ON seller.id = o.seller_id
    LEFT JOIN seller_reviews r ON r.order_id = o.id
    WHERE o.buyer_id = ${uid} AND o.status = 'completed'
    ORDER BY o.completed_at DESC
  `;

  const sales = await sql`
    SELECT
      o.id,
      o.listing_id,
      o.price_cents,
      o.postage_cents,
      o.currency,
      o.completed_at,
      l.card_id,
      l.card_name,
      l.set_name,
      buyer.name AS counterparty_name,
      false AS has_review
    FROM marketplace_orders o
    JOIN marketplace_listings l ON l.id = o.listing_id
    JOIN users buyer ON buyer.id = o.buyer_id
    WHERE o.seller_id = ${uid} AND o.status = 'completed'
    ORDER BY o.completed_at DESC
  `;

  return NextResponse.json({ purchases, sales });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (getStripe()) {
    return NextResponse.json(
      {
        error: "Use Pay with card on the listing page (this site uses Stripe for purchases).",
      },
      { status: 400 }
    );
  }

  let body: { listingId?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const listingId =
    typeof body.listingId === "number" ? body.listingId : parseInt(String(body.listingId), 10);
  if (!Number.isFinite(listingId)) {
    return NextResponse.json({ error: "Invalid or missing listing." }, { status: 400 });
  }

  const buyerId = session.user.id;

  const inserted = await sql`
    WITH upd AS (
      UPDATE marketplace_listings
      SET status = 'sold', updated_at = NOW()
      WHERE id = ${listingId}
        AND status = 'active'
        AND seller_id <> ${buyerId}
      RETURNING id AS listing_id, seller_id, price_cents, postage_cents, currency
    )
    INSERT INTO marketplace_orders (listing_id, buyer_id, seller_id, price_cents, postage_cents, currency, status, completed_at)
    SELECT listing_id, ${buyerId}, seller_id, price_cents, postage_cents, currency, 'completed', NOW()
    FROM upd
    RETURNING id, listing_id, seller_id, price_cents, postage_cents, currency, completed_at
  `;

  const order = inserted[0];
  if (!order) {
    return NextResponse.json(
      { error: "Purchase didn’t go through—it may be sold, removed, or your own listing." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    orderId: order.id,
    message: "Purchase recorded (no payment processor configured on this server).",
  });
}
