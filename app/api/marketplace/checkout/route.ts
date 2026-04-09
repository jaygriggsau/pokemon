import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";
import { stripeMinimumChargeMinor } from "@/lib/listing-money";
import { appOrigin, getStripe, platformFeeCents } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Card checkout is not configured." }, { status: 503 });
  }

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
    return NextResponse.json({ error: "Invalid listing" }, { status: 400 });
  }

  const buyerId = session.user.id;

  const rows = await sql`
    SELECT
      l.id,
      l.seller_id,
      l.card_name,
      l.price_cents,
      l.postage_cents,
      l.currency,
      l.status,
      u.stripe_connect_account_id
    FROM marketplace_listings l
    JOIN users u ON u.id = l.seller_id
    WHERE l.id = ${listingId}
    LIMIT 1
  `;

  const listing = rows[0] as
    | {
        id: number;
        seller_id: string;
        card_name: string;
        price_cents: number;
        postage_cents: number;
        currency: string;
        status: string;
        stripe_connect_account_id: string | null;
      }
    | undefined;

  if (!listing || listing.status !== "active") {
    return NextResponse.json({ error: "This listing is not available for purchase." }, { status: 400 });
  }
  if (listing.seller_id === buyerId) {
    return NextResponse.json({ error: "You cannot buy your own listing." }, { status: 400 });
  }
  if (!listing.stripe_connect_account_id) {
    return NextResponse.json(
      { error: "The seller has not finished payout setup yet." },
      { status: 400 }
    );
  }

  const acc = await stripe.accounts.retrieve(listing.stripe_connect_account_id);
  if (!acc.charges_enabled) {
    return NextResponse.json(
      { error: "The seller cannot accept card payments yet. Try again later." },
      { status: 400 }
    );
  }

  const totalCents = listing.price_cents + listing.postage_cents;
  const currencyUpper = listing.currency.toUpperCase();
  const currencyLower = currencyUpper.toLowerCase();
  const minMinor = stripeMinimumChargeMinor(currencyUpper);
  if (totalCents < minMinor) {
    return NextResponse.json(
      {
        error: `Order total is below the minimum charge Stripe allows for ${currencyUpper}.`,
      },
      { status: 400 }
    );
  }

  const fee = platformFeeCents(totalCents);
  if (fee >= totalCents) {
    return NextResponse.json({ error: "Order amount is too small after fees." }, { status: 400 });
  }

  const origin = appOrigin();
  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: currencyLower,
          unit_amount: totalCents,
          product_data: {
            name: listing.card_name,
            description: `Marketplace · item and postage · listing #${listing.id}`,
          },
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: fee,
      transfer_data: { destination: listing.stripe_connect_account_id },
    },
    success_url: `${origin}/marketplace/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/marketplace/${listingId}?checkout=cancelled`,
    metadata: {
      listing_id: String(listingId),
      buyer_id: buyerId,
    },
  });

  if (!checkout.url) {
    return NextResponse.json({ error: "Could not start checkout." }, { status: 500 });
  }

  return NextResponse.json({ url: checkout.url });
}
