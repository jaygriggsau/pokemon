import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await sql`
    SELECT id, card_id, card_name, card_image, set_name, created_at
    FROM watchlist
    WHERE user_id = ${session.user.id}
    ORDER BY created_at DESC
  `;

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { cardId, cardName, cardImage, setName } = await req.json();

  try {
    await sql`
      INSERT INTO watchlist (user_id, card_id, card_name, card_image, set_name)
      VALUES (${session.user.id}, ${cardId}, ${cardName}, ${cardImage ?? null}, ${setName ?? null})
      ON CONFLICT (user_id, card_id) DO NOTHING
    `;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to add to watchlist." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { cardId } = await req.json();

  await sql`
    DELETE FROM watchlist
    WHERE user_id = ${session.user.id} AND card_id = ${cardId}
  `;

  return NextResponse.json({ ok: true });
}
