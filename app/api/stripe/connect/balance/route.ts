import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET() {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
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
    return NextResponse.json({ error: "No seller account connected." }, { status: 400 });
  }

  const balance = await stripe.balance.retrieve({}, { stripeAccount: accountId });

  const sum = (arr: { amount: number; currency: string }[], cur: string) =>
    arr.filter((b) => b.currency === cur).reduce((s, b) => s + b.amount, 0);

  const currencies = new Set<string>();
  for (const b of [...balance.available, ...balance.pending]) {
    currencies.add(b.currency);
  }

  const breakdown = [...currencies].map((currency) => ({
    currency: currency.toUpperCase(),
    available: sum(balance.available, currency),
    pending: sum(balance.pending, currency),
  }));

  return NextResponse.json({ breakdown });
}
