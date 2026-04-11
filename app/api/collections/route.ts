import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await sql`
    SELECT c.id, c.name, c.created_at, c.updated_at,
      (SELECT COUNT(*)::int FROM collection_items ci WHERE ci.collection_id = c.id) AS item_count
    FROM collections c
    WHERE c.user_id = ${session.user.id}
    ORDER BY c.updated_at DESC, c.id DESC
  `;

  return NextResponse.json({ collections: rows });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const inserted = await sql`
    INSERT INTO collections (user_id, name)
    VALUES (${session.user.id}, ${name})
    RETURNING id, name, created_at, updated_at
  `;

  const row = inserted[0];
  return NextResponse.json({
    collection: { ...row, item_count: 0 },
  });
}
