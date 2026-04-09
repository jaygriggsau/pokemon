import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";
import { stripePaymentsEnabled } from "@/lib/stripe";
import { isSellerSubscriptionActive, sellerSubscriptionConfigured } from "@/lib/seller-subscription";

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

  const [row] = await sql`
    SELECT
      seller_subscription_status,
      seller_subscription_current_period_end,
      stripe_seller_customer_id
    FROM users
    WHERE id = ${session.user.id}
    LIMIT 1
  `;

  const st = row?.seller_subscription_status as string | null;
  const periodEnd = row?.seller_subscription_current_period_end as Date | string | null;

  return NextResponse.json({
    paymentsEnabled: true,
    subscriptionProductConfigured: true,
    active: isSellerSubscriptionActive(st),
    status: st,
    currentPeriodEnd: periodEnd ? new Date(periodEnd).toISOString() : null,
    canManage: Boolean(row?.stripe_seller_customer_id),
  });
}
