import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";

async function assertOwner(collectionId: number, userId: string) {
  const rows = await sql`
    SELECT id FROM collections WHERE id = ${collectionId} AND user_id = ${userId} LIMIT 1
  `;
  return rows.length > 0;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: raw } = await params;
  const collectionId = Number(raw);
  if (!Number.isFinite(collectionId) || collectionId < 1) {
    return NextResponse.json({ error: "Invalid collection" }, { status: 400 });
  }

  if (!(await assertOwner(collectionId, session.user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: {
    cardId?: number;
    cardName?: string;
    cardImage?: string | null;
    setName?: string | null;
    quantity?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const cardId = typeof body.cardId === "number" ? body.cardId : Number(body.cardId);
  const cardName = typeof body.cardName === "string" ? body.cardName.trim() : "";
  const qtyIn = typeof body.quantity === "number" ? body.quantity : 1;
  const quantity = Number.isFinite(qtyIn) ? Math.min(999, Math.max(1, Math.floor(qtyIn))) : 1;

  if (!Number.isFinite(cardId) || cardId < 1 || !cardName) {
    return NextResponse.json({ error: "cardId and cardName are required." }, { status: 400 });
  }

  const cardImage = typeof body.cardImage === "string" ? body.cardImage : null;
  const setName = typeof body.setName === "string" ? body.setName : null;

  await sql`
    INSERT INTO collection_items (collection_id, card_id, card_name, card_image, set_name, quantity)
    VALUES (${collectionId}, ${cardId}, ${cardName}, ${cardImage}, ${setName}, ${quantity})
    ON CONFLICT (collection_id, card_id) DO UPDATE SET
      quantity = LEAST(collection_items.quantity + EXCLUDED.quantity, 999),
      card_name = EXCLUDED.card_name,
      card_image = EXCLUDED.card_image,
      set_name = EXCLUDED.set_name
  `;

  await sql`UPDATE collections SET updated_at = NOW() WHERE id = ${collectionId}`;

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: raw } = await params;
  const collectionId = Number(raw);
  if (!Number.isFinite(collectionId) || collectionId < 1) {
    return NextResponse.json({ error: "Invalid collection" }, { status: 400 });
  }

  if (!(await assertOwner(collectionId, session.user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const cardId = Number(searchParams.get("cardId"));
  if (!Number.isFinite(cardId) || cardId < 1) {
    return NextResponse.json({ error: "cardId query required" }, { status: 400 });
  }

  await sql`
    DELETE FROM collection_items
    WHERE collection_id = ${collectionId} AND card_id = ${cardId}
  `;

  await sql`UPDATE collections SET updated_at = NOW() WHERE id = ${collectionId}`;

  return NextResponse.json({ ok: true });
}
