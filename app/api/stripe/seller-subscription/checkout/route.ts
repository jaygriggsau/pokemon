import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";
import { appOrigin, getStripe } from "@/lib/stripe";
import { isSellerSubscriptionActive, sellerSubscriptionPriceId } from "@/lib/seller-subscription";

export const runtime = "nodejs";

export async function POST() {
  const stripe = getStripe();
  const priceId = sellerSubscriptionPriceId();
  if (!stripe || !priceId) {
    return NextResponse.json({ error: "Seller subscriptions are not configured." }, { status: 503 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uid = session.user.id;

  const [user] = await sql`
    SELECT email, stripe_seller_customer_id, seller_subscription_status
    FROM users
    WHERE id = ${uid}
    LIMIT 1
  `;

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (isSellerSubscriptionActive(user.seller_subscription_status as string | null)) {
    return NextResponse.json(
      { error: "Your seller subscription is already active.", alreadySubscribed: true },
      { status: 400 }
    );
  }

  const email = user.email as string | null;
  const customerId = user.stripe_seller_customer_id as string | null;

  const origin = appOrigin();
  if (!customerId && !email) {
    return NextResponse.json(
      { error: "Your account needs an email address to subscribe." },
      { status: 400 }
    );
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/marketplace/sell/seller-account?sub_success=1`,
    cancel_url: `${origin}/marketplace/sell/seller-account?sub_canceled=1`,
    metadata: { pokeprice_user_id: uid },
    subscription_data: {
      metadata: { pokeprice_user_id: uid },
    },
    ...(customerId ? { customer: customerId } : { customer_email: email! }),
  });
  if (!checkout.url) {
    return NextResponse.json({ error: "Could not start checkout." }, { status: 500 });
  }

  return NextResponse.json({ url: checkout.url });
}
