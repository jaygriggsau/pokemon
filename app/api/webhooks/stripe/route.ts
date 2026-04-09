import { NextResponse } from "next/server";
import Stripe from "stripe";
import { sql } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

/** SDK v22 types omit `current_period_end`; the Subscription API object still includes it. */
function subscriptionPeriodEnd(sub: Stripe.Subscription): Date | null {
  const end = (sub as Stripe.Subscription & { current_period_end?: number })
    .current_period_end;
  if (end == null || typeof end !== "number") return null;
  return new Date(end * 1000);
}

function subscriptionCustomerId(sub: Stripe.Subscription): string {
  return typeof sub.customer === "string" ? sub.customer : sub.customer.id;
}

async function handleSellerSubscriptionCheckout(stripe: Stripe, session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription") return;
  const userId = session.metadata?.pokeprice_user_id;
  if (!userId || typeof userId !== "string") {
    console.error("[stripe webhook] subscription checkout missing pokeprice_user_id", session.id);
    return;
  }

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (!customerId || !subId) {
    console.error("[stripe webhook] subscription checkout missing customer or subscription", session.id);
    return;
  }

  const sub = await stripe.subscriptions.retrieve(subId);
  const periodEnd = subscriptionPeriodEnd(sub);

  await sql`
    UPDATE users
    SET
      stripe_seller_customer_id = ${customerId},
      seller_subscription_id = ${sub.id},
      seller_subscription_status = ${sub.status},
      seller_subscription_current_period_end = ${periodEnd}
    WHERE id = ${userId}
  `;
}

async function syncUserSubscriptionFromStripe(sub: Stripe.Subscription) {
  const customerId = subscriptionCustomerId(sub);
  const periodEnd = subscriptionPeriodEnd(sub);

  let userId = sub.metadata?.pokeprice_user_id;
  if (!userId || typeof userId !== "string") {
    const byCust = await sql`
      SELECT id FROM users WHERE stripe_seller_customer_id = ${customerId} LIMIT 1
    `;
    if (byCust.length) {
      userId = (byCust[0] as { id: string }).id;
    }
  }
  if (!userId || typeof userId !== "string") {
    const bySub = await sql`
      SELECT id FROM users WHERE seller_subscription_id = ${sub.id} LIMIT 1
    `;
    if (bySub.length) {
      userId = (bySub[0] as { id: string }).id;
    }
  }
  if (!userId) {
    console.warn("[stripe webhook] subscription sync: no user match", sub.id);
    return;
  }

  await sql`
    UPDATE users
    SET
      seller_subscription_id = ${sub.id},
      seller_subscription_status = ${sub.status},
      seller_subscription_current_period_end = ${periodEnd},
      stripe_seller_customer_id = COALESCE(stripe_seller_customer_id, ${customerId})
    WHERE id = ${userId}
  `;
}

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
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription") {
          await handleSellerSubscriptionCheckout(stripe, session);
        } else if (session.mode === "payment" && session.payment_status === "paid") {
          await handleCheckoutCompleted(stripe, session);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncUserSubscriptionFromStripe(event.data.object as Stripe.Subscription);
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
