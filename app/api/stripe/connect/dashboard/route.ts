import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

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

  const [row] = await sql`
    SELECT stripe_connect_account_id FROM users WHERE id = ${session.user.id} LIMIT 1
  `;
  const accountId = row?.stripe_connect_account_id as string | null;
  if (!accountId) {
    return NextResponse.json({ error: "Connect Stripe on the Sell page first." }, { status: 400 });
  }

  const link = await stripe.accounts.createLoginLink(accountId);
  return NextResponse.json({ url: link.url });
}
