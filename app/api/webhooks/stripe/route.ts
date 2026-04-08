import { NextResponse } from "next/server";
import Stripe from "stripe";
import { sql } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

async function handleCheckoutCompleted(stripe: Stripe, session: Stripe.Checkout.Session) {
  if (session.mode !== "payment" || session.payment_status !== "paid") return;

  const listingId = parseInt(session.metadata?.listing_id ?? "", 10);
  const buyerId = session.metadata?.buyer_id ?? "";
  if (!Number.isFinite(listingId) || !buyerId) {
    console.error("[stripe webhook] checkout.session.completed missing metadata", session.id);
    return;
  }

  const existing = await sql`
    SELECT id FROM marketplace_orders WHERE stripe_checkout_session_id = ${session.id} LIMIT 1
  `;
  if (existing.length) return;

  const pi =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  if (!pi) {
    console.error("[stripe webhook] no payment_intent on session", session.id);
    return;
  }

  const dupPi = await sql`
    SELECT id FROM marketplace_orders WHERE stripe_payment_intent_id = ${pi} LIMIT 1
  `;
  if (dupPi.length) return;

  const inserted = await sql`
    WITH upd AS (
      UPDATE marketplace_listings
      SET status = 'sold', updated_at = NOW()
      WHERE id = ${listingId} AND status = 'active'
      RETURNING id AS listing_id, seller_id, price_cents, postage_cents, currency
    )
    INSERT INTO marketplace_orders (
      listing_id, buyer_id, seller_id, price_cents, postage_cents, currency,
      status, completed_at, stripe_checkout_session_id, stripe_payment_intent_id
    )
    SELECT
      listing_id,
      ${buyerId},
      seller_id,
      price_cents,
      postage_cents,
      currency,
      'completed',
      NOW(),
      ${session.id},
      ${pi}
    FROM upd
    RETURNING id
  `;

  if (!inserted.length) {
    try {
      await stripe.refunds.create({ payment_intent: pi });
      console.warn("[stripe webhook] listing unavailable; issued refund", { listingId, session: session.id });
    } catch (re) {
      console.error("[stripe webhook] refund failed", re);
      throw re;
    }
  }
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !whSecret) {
    return NextResponse.json({ error: "Stripe webhooks not configured" }, { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, whSecret);
  } catch (e) {
    console.error("[stripe webhook] invalid signature", e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(stripe, event.data.object as Stripe.Checkout.Session);
        break;
      case "account.updated": {
        const acc = event.data.object as Stripe.Account;
        await sql`
          UPDATE users
          SET
            stripe_charges_enabled = ${Boolean(acc.charges_enabled)},
            stripe_payouts_enabled = ${Boolean(acc.payouts_enabled)}
          WHERE stripe_connect_account_id = ${acc.id}
        `;
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[stripe webhook] handler", event.type, e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
