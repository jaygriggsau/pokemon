import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getPublicSellerReviews } from "@/lib/seller-reviews-public";
import { stripePaymentsEnabled } from "@/lib/stripe";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idRaw } = await ctx.params;
  const id = parseInt(idRaw, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid listing ID." }, { status: 400 });
  }

  const rows = await sql`
    SELECT
      l.*,
      u.name AS seller_name,
      u.stripe_charges_enabled,
      u.stripe_connect_account_id,
      (SELECT COUNT(*)::int FROM seller_reviews sr WHERE sr.seller_id = l.seller_id) AS seller_review_count,
      (SELECT ROUND(AVG(sr.rating)::numeric, 2) FROM seller_reviews sr WHERE sr.seller_id = l.seller_id) AS seller_avg_rating
    FROM marketplace_listings l
    JOIN users u ON u.id = l.seller_id
    WHERE l.id = ${id}
    LIMIT 1
  `;

  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stripeCharges = Boolean(row.stripe_charges_enabled);
  const stripeAccount = row.stripe_connect_account_id as string | null;
  const marketplacePaymentsEnabled = stripePaymentsEnabled();
  const cardCheckoutAvailable =
    marketplacePaymentsEnabled && Boolean(stripeAccount && stripeCharges);

  const {
    stripe_charges_enabled: _sc,
    stripe_connect_account_id: _sa,
    ...listing
  } = row as Record<string, unknown>;

  const sellerId = String((row as { seller_id: string }).seller_id);
  const sellerReviews = await getPublicSellerReviews(sellerId, 15);

  return NextResponse.json({
    listing,
    sellerReviews,
    cardCheckoutAvailable,
    marketplacePaymentsEnabled,
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idRaw } = await ctx.params;
  const id = parseInt(idRaw, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid listing ID." }, { status: 400 });
  }

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.status !== "cancelled") {
    return NextResponse.json({ error: "Only cancelling a listing is supported." }, { status: 400 });
  }

  const updated = await sql`
    UPDATE marketplace_listings
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = ${id} AND seller_id = ${session.user.id} AND status = 'active'
    RETURNING id
  `;

  if (!updated.length) {
    return NextResponse.json({ error: "Listing not found or already sold/cancelled." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
