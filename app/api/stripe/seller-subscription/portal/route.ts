import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";
import { appOrigin, getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST() {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe isn’t configured on this server." }, { status: 503 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await sql`
    SELECT stripe_seller_customer_id FROM users WHERE id = ${session.user.id} LIMIT 1
  `;
  const customerId = user?.stripe_seller_customer_id as string | null;
  if (!customerId) {
    return NextResponse.json(
      { error: "Subscribe first—no billing profile on file yet." },
      { status: 400 }
    );
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appOrigin()}/marketplace/sell/seller-account`,
  });

  return NextResponse.json({ url: portal.url });
}
