import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";
import { fetchTcgCardById } from "@/lib/tcggo-fetch";
import { referenceEuEur, referenceTcgplayer } from "@/lib/tcggo";

type Row = {
  id: number;
  card_id: number;
  card_name: string;
  set_name: string | null;
  card_image: string | null;
  quantity: number;
};

async function assertOwner(collectionId: number, userId: string) {
  const rows = await sql`
    SELECT id FROM collections WHERE id = ${collectionId} AND user_id = ${userId} LIMIT 1
  `;
  return rows.length > 0;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const meta = await sql`
    SELECT id, name, created_at, updated_at
    FROM collections
    WHERE id = ${collectionId}
    LIMIT 1
  `;

  const items = (await sql`
    SELECT id, card_id, card_name, set_name, card_image, quantity
    FROM collection_items
    WHERE collection_id = ${collectionId}
    ORDER BY created_at ASC
  `) as Row[];

  const uniqueIds = [...new Set(items.map((i) => i.card_id))];
  const cards = await Promise.all(uniqueIds.map((cid) => fetchTcgCardById(cid)));
  const cardById = new Map(uniqueIds.map((cid, i) => [cid, cards[i]]));

  let missingPriceEu = 0;
  let missingPriceTcg = 0;
  let missingCard = 0;

  const priced = items.map((row) => {
    const card = cardById.get(row.card_id) ?? null;
    if (!card) missingCard += 1;
    const euEur = card ? referenceEuEur(card) : null;
    const tcg = card ? referenceTcgplayer(card) : null;
    if (euEur == null) missingPriceEu += 1;
    if (tcg == null) missingPriceTcg += 1;

    return {
      id: row.id,
      card_id: row.card_id,
      card_name: row.card_name,
      set_name: row.set_name,
      card_image: row.card_image,
      quantity: row.quantity,
      cardResolved: card != null,
      euEur,
      tcgAmount: tcg?.amount ?? null,
      tcgFrom: tcg?.from ?? null,
    };
  });

  return NextResponse.json({
    collection: meta[0],
    items: priced,
    stats: {
      itemRows: items.length,
      missingCard,
      missingPriceEu,
      missingPriceTcg,
    },
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 200) {
    return NextResponse.json({ error: "Name must be 1–200 characters." }, { status: 400 });
  }

  await sql`
    UPDATE collections SET name = ${name}, updated_at = NOW()
    WHERE id = ${collectionId} AND user_id = ${session.user.id}
  `;

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: raw } = await params;
  const collectionId = Number(raw);
  if (!Number.isFinite(collectionId) || collectionId < 1) {
    return NextResponse.json({ error: "Invalid collection" }, { status: 400 });
  }

  const del = await sql`
    DELETE FROM collections
    WHERE id = ${collectionId} AND user_id = ${session.user.id}
    RETURNING id
  `;

  if (!del.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
