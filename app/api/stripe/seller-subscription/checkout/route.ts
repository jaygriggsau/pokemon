import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";
import { appOrigin, getStripe, STRIPE_APP_USER_METADATA_KEY } from "@/lib/stripe";
import { sellerSubscriptionPriceId } from "@/lib/seller-subscription";
import { getLiveSellerPlanForPrice } from "@/lib/seller-subscription-stripe-verify";

export const runtime = "nodejs";

export async function POST() {
  const stripe = getStripe();
  const priceId = sellerSubscriptionPriceId();
  if (!stripe || !priceId) {
    return NextResponse.json({ error: "Seller subscriptions aren’t set up on this server." }, { status: 503 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uid = session.user.id;

  const [user] = await sql`
    SELECT email, stripe_seller_customer_id
    FROM users
    WHERE id = ${uid}
    LIMIT 1
  `;

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const email = user.email as string | null;
  const customerId = user.stripe_seller_customer_id as string | null;

  if (customerId) {
    const live = await getLiveSellerPlanForPrice(stripe, customerId, priceId);
    if (!live.ok) {
      return NextResponse.json(
        { error: "Couldn’t reach Stripe. Try again in a moment." },
        { status: 503 }
      );
    }
    if (live.active) {
      return NextResponse.json(
        { error: "Your seller subscription is already active.", alreadySubscribed: true },
        { status: 400 }
      );
    }
  }


  const origin = appOrigin();
  if (!customerId && !email) {
    return NextResponse.json(
      { error: "Add an email to your account before subscribing." },
      { status: 400 }
    );
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/marketplace/sell/seller-account?sub_success=1`,
    cancel_url: `${origin}/marketplace/sell/seller-account?sub_canceled=1`,
    metadata: { [STRIPE_APP_USER_METADATA_KEY]: uid },
    subscription_data: {
      metadata: { [STRIPE_APP_USER_METADATA_KEY]: uid },
    },
    ...(customerId ? { customer: customerId } : { customer_email: email! }),
  });
  if (!checkout.url) {
    return NextResponse.json({ error: "Couldn’t start checkout. Try again." }, { status: 500 });
  }

  return NextResponse.json({ url: checkout.url });
}
