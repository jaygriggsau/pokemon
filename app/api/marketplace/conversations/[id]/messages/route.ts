import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";
import { MAX_MESSAGE_CHARS, normalizeMessageBody } from "@/lib/marketplace-messages";

async function assertConversationMember(conversationId: number, userId: string) {
  const rows = await sql`
    SELECT buyer_id, seller_id FROM marketplace_conversations WHERE id = ${conversationId} LIMIT 1
  `;
  const row = rows[0] as { buyer_id: string; seller_id: string } | undefined;
  if (!row) return { ok: false as const, status: 404 as const };
  if (row.buyer_id !== userId && row.seller_id !== userId) {
    return { ok: false as const, status: 403 as const };
  }
  return { ok: true as const };
}

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

  const member = await assertConversationMember(conversationId, session.user.id);
  if (!member.ok) {
    return NextResponse.json({ error: member.status === 404 ? "Not found" : "Forbidden" }, { status: member.status });
  }

  const messages = await sql`
    SELECT
      m.id,
      m.body,
      m.sender_id,
      m.created_at,
      u.name AS sender_name
    FROM marketplace_messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id = ${conversationId}
    ORDER BY m.created_at ASC
    LIMIT 400
  `;

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      body: m.body,
      senderId: m.sender_id,
      senderName: m.sender_name,
      createdAt: m.created_at,
    })),
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: raw } = await ctx.params;
  const conversationId = parseInt(raw, 10);
  if (!Number.isFinite(conversationId)) {
    return NextResponse.json({ error: "Invalid conversation" }, { status: 400 });
  }

  const member = await assertConversationMember(conversationId, session.user.id);
  if (!member.ok) {
    return NextResponse.json({ error: member.status === 404 ? "Not found" : "Forbidden" }, { status: member.status });
  }

  let body: { body?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = normalizeMessageBody(body.body);
  if (!text) {
    return NextResponse.json(
      { error: `Message must be 1–${MAX_MESSAGE_CHARS} characters after trimming.` },
      { status: 400 }
    );
  }

  await sql`
    INSERT INTO marketplace_messages (conversation_id, sender_id, body)
    VALUES (${conversationId}, ${session.user.id}, ${text})
  `;
  await sql`
    UPDATE marketplace_conversations SET updated_at = NOW() WHERE id = ${conversationId}
  `;

  return NextResponse.json({ ok: true });
}
