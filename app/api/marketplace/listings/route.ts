import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";
import {
  LISTING_CONDITIONS,
  LISTING_CURRENCIES,
  validateListingPhotoUrl,
  parsePositiveCents,
  parseNonNegativeCents,
} from "@/lib/marketplace";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cardIdRaw = searchParams.get("cardId");
  let cardId: number | null = null;
  if (cardIdRaw) {
    cardId = parseInt(cardIdRaw, 10);
    if (!Number.isFinite(cardId)) {
      return NextResponse.json({ error: "Invalid cardId" }, { status: 400 });
    }
  }

  const rows = cardId
    ? await sql`
        SELECT
          l.id,
          l.seller_id,
          l.card_id,
          l.card_name,
          l.set_name,
          l.card_image,
          l.condition_grade,
          l.description,
          l.price_cents,
          l.postage_cents,
          l.currency,
          l.status,
          l.created_at,
          u.name AS seller_name,
          (SELECT COUNT(*)::int FROM seller_reviews sr WHERE sr.seller_id = l.seller_id) AS seller_review_count,
          (SELECT ROUND(AVG(sr.rating)::numeric, 2) FROM seller_reviews sr WHERE sr.seller_id = l.seller_id) AS seller_avg_rating
        FROM marketplace_listings l
        JOIN users u ON u.id = l.seller_id
        WHERE l.status = 'active' AND l.card_id = ${cardId}
        ORDER BY l.created_at DESC
      `
    : await sql`
        SELECT
          l.id,
          l.seller_id,
          l.card_id,
          l.card_name,
          l.set_name,
          l.card_image,
          l.condition_grade,
          l.description,
          l.price_cents,
          l.postage_cents,
          l.currency,
          l.status,
          l.created_at,
          u.name AS seller_name,
          (SELECT COUNT(*)::int FROM seller_reviews sr WHERE sr.seller_id = l.seller_id) AS seller_review_count,
          (SELECT ROUND(AVG(sr.rating)::numeric, 2) FROM seller_reviews sr WHERE sr.seller_id = l.seller_id) AS seller_avg_rating
        FROM marketplace_listings l
        JOIN users u ON u.id = l.seller_id
        WHERE l.status = 'active'
        ORDER BY l.created_at DESC
      `;

  return NextResponse.json({ listings: rows });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    cardId,
    cardName,
    setName,
    cardImage,
    conditionGrade,
    description,
    priceCents,
    postageCents,
    currency,
    photoFrontUrl,
    photoBackUrl,
  } = body;

  const cid = typeof cardId === "number" ? cardId : parseInt(String(cardId), 10);
  if (!Number.isFinite(cid) || cid <= 0) {
    return NextResponse.json({ error: "Invalid card" }, { status: 400 });
  }

  if (typeof cardName !== "string" || !cardName.trim()) {
    return NextResponse.json({ error: "Card name is required" }, { status: 400 });
  }

  if (!LISTING_CONDITIONS.includes(conditionGrade as (typeof LISTING_CONDITIONS)[number])) {
    return NextResponse.json({ error: "Invalid condition" }, { status: 400 });
  }

  if (!LISTING_CURRENCIES.includes(currency as (typeof LISTING_CURRENCIES)[number])) {
    return NextResponse.json({ error: "Currency must be USD or EUR" }, { status: 400 });
  }

  const p = parsePositiveCents(priceCents, "Price");
  if (!p.ok) return NextResponse.json({ error: p.error }, { status: 400 });
  const post = parseNonNegativeCents(postageCents ?? 0, "Postage");
  if (!post.ok) return NextResponse.json({ error: post.error }, { status: 400 });

  const errF = validateListingPhotoUrl(photoFrontUrl, "Front photo");
  if (errF) return NextResponse.json({ error: errF }, { status: 400 });
  const errB = validateListingPhotoUrl(photoBackUrl, "Back photo");
  if (errB) return NextResponse.json({ error: errB }, { status: 400 });

  const desc =
    typeof description === "string" && description.length > 2000
      ? description.slice(0, 2000)
      : typeof description === "string"
        ? description
        : null;

  try {
    const [row] = await sql`
      INSERT INTO marketplace_listings (
        seller_id, card_id, card_name, set_name, card_image,
        condition_grade, description, price_cents, postage_cents, currency,
        photo_front, photo_back, status
      )
      VALUES (
        ${session.user.id},
        ${cid},
        ${cardName.trim()},
        ${typeof setName === "string" ? setName.trim() || null : null},
        ${typeof cardImage === "string" ? cardImage : null},
        ${conditionGrade},
        ${desc},
        ${p.cents},
        ${post.cents},
        ${currency},
        ${photoFrontUrl},
        ${photoBackUrl},
        'active'
      )
      RETURNING id
    `;
    return NextResponse.json({ id: row.id });
  } catch {
    return NextResponse.json({ error: "Could not create listing" }, { status: 500 });
  }
}
