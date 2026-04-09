import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getPublicSellerReviews } from "@/lib/seller-reviews-public";

/** Public list of reviews for a seller (e.g. marketplace profile / listing context). */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sellerId = searchParams.get("sellerId")?.trim();
  if (!sellerId) {
    return NextResponse.json({ error: "Missing seller ID." }, { status: 400 });
  }

  const limitRaw = searchParams.get("limit");
  const parsed = limitRaw ? parseInt(limitRaw, 10) : 20;
  const limit = Number.isFinite(parsed) ? parsed : 20;

  const reviews = await getPublicSellerReviews(sellerId, limit);
  return NextResponse.json({ reviews });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { orderId?: number; rating?: number; comment?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId =
    typeof body.orderId === "number" ? body.orderId : parseInt(String(body.orderId), 10);
  const rating =
    typeof body.rating === "number" ? body.rating : parseInt(String(body.rating), 10);

  if (!Number.isFinite(orderId) || !Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Need a valid order and a rating from 1 to 5." }, { status: 400 });
  }

  const comment =
    typeof body.comment === "string" ? body.comment.trim().slice(0, 2000) : null;

  const orders = await sql`
    SELECT id, buyer_id, seller_id
    FROM marketplace_orders
    WHERE id = ${orderId} AND status = 'completed'
    LIMIT 1
  `;
  const order = orders[0];
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.buyer_id !== session.user.id) {
    return NextResponse.json({ error: "Only the buyer can leave this review." }, { status: 403 });
  }

  try {
    await sql`
      INSERT INTO seller_reviews (order_id, reviewer_id, seller_id, rating, comment)
      VALUES (${orderId}, ${session.user.id}, ${order.seller_id}, ${rating}, ${comment})
    `;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "You’ve already reviewed this order." }, { status: 400 });
  }
}
