import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: raw } = await ctx.params;
  const conversationId = parseInt(raw, 10);
  if (!Number.isFinite(conversationId)) {
    return NextResponse.json({ error: "Invalid conversation" }, { status: 400 });
  }

  const uid = session.user.id;

  const rows = await sql`
    SELECT
      c.id,
      c.listing_id,
      c.buyer_id,
      c.seller_id,
      l.card_name,
      l.set_name,
      l.status AS listing_status,
      buyer.name AS buyer_name,
      seller.name AS seller_name
    FROM marketplace_conversations c
    JOIN marketplace_listings l ON l.id = c.listing_id
    JOIN users buyer ON buyer.id = c.buyer_id
    JOIN users seller ON seller.id = c.seller_id
    WHERE c.id = ${conversationId}
    LIMIT 1
  `;

  const row = rows[0] as
    | {
        id: number;
        listing_id: number;
        buyer_id: string;
        seller_id: string;
        card_name: string;
        set_name: string | null;
        listing_status: string;
        buyer_name: string | null;
        seller_name: string | null;
      }
    | undefined;

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (row.buyer_id !== uid && row.seller_id !== uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const role = row.buyer_id === uid ? "buyer" : "seller";
  const otherPartyName =
    role === "buyer" ? row.seller_name ?? "Seller" : row.buyer_name ?? "Buyer";

  return NextResponse.json({
    conversationId: row.id,
    listingId: row.listing_id,
    listingStatus: row.listing_status,
    cardName: row.card_name,
    setName: row.set_name,
    role,
    otherPartyName,
  });
}
