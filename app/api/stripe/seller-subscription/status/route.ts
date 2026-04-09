import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getStripe, stripePaymentsEnabled } from "@/lib/stripe";
import { sellerSubscriptionConfigured, sellerSubscriptionPriceId } from "@/lib/seller-subscription";
import { getLiveSellerPlanForPrice } from "@/lib/seller-subscription-stripe-verify";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const paymentsEnabled = stripePaymentsEnabled();
  const configured = sellerSubscriptionConfigured();

  if (!paymentsEnabled || !configured) {
    return NextResponse.json({
      paymentsEnabled,
      subscriptionProductConfigured: configured,
      active: true,
      status: null as string | null,
      currentPeriodEnd: null as string | null,
      canManage: false,
    });
  }

  const stripe = getStripe();
  const priceId = sellerSubscriptionPriceId();
  if (!stripe || !priceId) {
    return NextResponse.json({ error: "Stripe billing isn’t configured on the server." }, { status: 503 });
  }

  const [row] = await sql`
    SELECT stripe_seller_customer_id
    FROM users
    WHERE id = ${session.user.id}
    LIMIT 1
  `;

  const customerId = row?.stripe_seller_customer_id as string | null;
  if (!customerId) {
    return NextResponse.json({
      paymentsEnabled: true,
      subscriptionProductConfigured: true,
      active: false,
      status: null as string | null,
      currentPeriodEnd: null as string | null,
      canManage: false,
    });
  }

  const live = await getLiveSellerPlanForPrice(stripe, customerId, priceId);
  if (!live.ok) {
    return NextResponse.json(
      { error: "Couldn’t reach Stripe to check your plan. Try again in a moment." },
      { status: 503 }
    );
  }

  return NextResponse.json({
    paymentsEnabled: true,
    subscriptionProductConfigured: true,
    active: live.active,
    status: live.stripeStatus,
    currentPeriodEnd: live.currentPeriodEnd ? live.currentPeriodEnd.toISOString() : null,
    canManage: true,
  });
}
