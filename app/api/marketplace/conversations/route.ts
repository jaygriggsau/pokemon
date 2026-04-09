import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uid = session.user.id;

  const rows = await sql`
    SELECT
      c.id,
      c.listing_id,
      c.buyer_id,
      c.seller_id,
      c.updated_at,
      l.card_name,
      l.set_name,
      l.card_image,
      l.status AS listing_status,
      buyer.name AS buyer_name,
      seller.name AS seller_name,
      (SELECT m.body FROM marketplace_messages m
       WHERE m.conversation_id = c.id
       ORDER BY m.created_at DESC LIMIT 1) AS last_body,
      (SELECT m.created_at FROM marketplace_messages m
       WHERE m.conversation_id = c.id
       ORDER BY m.created_at DESC LIMIT 1) AS last_message_at
    FROM marketplace_conversations c
    JOIN marketplace_listings l ON l.id = c.listing_id
    JOIN users buyer ON buyer.id = c.buyer_id
    JOIN users seller ON seller.id = c.seller_id
    WHERE c.buyer_id = ${uid} OR c.seller_id = ${uid}
    ORDER BY c.updated_at DESC
  `;

  const conversations = rows.map((r) => ({
    id: r.id,
    listingId: r.listing_id,
    listingStatus: r.listing_status,
    cardName: r.card_name,
    setName: r.set_name,
    cardImage: r.card_image,
    lastBody: r.last_body,
    lastMessageAt: r.last_message_at,
    role: r.buyer_id === uid ? ("buyer" as const) : ("seller" as const),
    otherPartyName:
      r.buyer_id === uid ? r.seller_name ?? "Seller" : r.buyer_name ?? "Buyer",
  }));

  return NextResponse.json({ conversations });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const listings = await sql`
    SELECT id, seller_id, status FROM marketplace_listings WHERE id = ${listingId} LIMIT 1
  `;
  const listing = listings[0] as { id: number; seller_id: string; status: string } | undefined;
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (listing.seller_id === buyerId) {
    return NextResponse.json({ error: "You cannot message yourself." }, { status: 400 });
  }

  const existing = await sql`
    SELECT id FROM marketplace_conversations
    WHERE listing_id = ${listingId} AND buyer_id = ${buyerId}
    LIMIT 1
  `;
  if (existing.length) {
    return NextResponse.json({ conversationId: (existing[0] as { id: number }).id });
  }

  if (listing.status !== "active") {
    return NextResponse.json(
      { error: "You can only message sellers on active listings." },
      { status: 400 }
    );
  }

  try {
    const inserted = await sql`
      INSERT INTO marketplace_conversations (listing_id, buyer_id, seller_id)
      VALUES (${listingId}, ${buyerId}, ${listing.seller_id})
      RETURNING id
    `;
    const row = inserted[0] as { id: number } | undefined;
    if (row) {
      return NextResponse.json({ conversationId: row.id });
    }
  } catch {
    const again = await sql`
      SELECT id FROM marketplace_conversations
      WHERE listing_id = ${listingId} AND buyer_id = ${buyerId}
      LIMIT 1
    `;
    if (again.length) {
      return NextResponse.json({ conversationId: (again[0] as { id: number }).id });
    }
  }

  return NextResponse.json({ error: "Couldn’t start the conversation. Try again." }, { status: 500 });
}
