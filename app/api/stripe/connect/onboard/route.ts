import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";
import { appOrigin, getStripe, STRIPE_APP_USER_METADATA_KEY } from "@/lib/stripe";

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

  const uid = session.user.id;
  const [row] = await sql`
    SELECT email, stripe_connect_account_id FROM users WHERE id = ${uid} LIMIT 1
  `;
  if (!row?.email) {
    return NextResponse.json({ error: "Your account needs an email to connect Stripe." }, { status: 400 });
  }

  const country = (process.env.STRIPE_CONNECT_DEFAULT_COUNTRY || "US").trim().toUpperCase();
  if (country.length !== 2) {
    return NextResponse.json({ error: "Invalid STRIPE_CONNECT_DEFAULT_COUNTRY (use a 2-letter ISO code)." }, { status: 500 });
  }

  let accountId = row.stripe_connect_account_id as string | null;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country,
      email: row.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { [STRIPE_APP_USER_METADATA_KEY]: uid },
    });
    accountId = account.id;
    await sql`
      UPDATE users SET stripe_connect_account_id = ${accountId} WHERE id = ${uid}
    `;
  }

  const origin = appOrigin();
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/marketplace/sell?stripe_refresh=1`,
    return_url: `${origin}/marketplace/sell?stripe_return=1`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: link.url });
}
