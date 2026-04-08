import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getStripe, stripePaymentsEnabled } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = getStripe();
  const paymentsEnabled = stripePaymentsEnabled();

  if (!paymentsEnabled || !stripe) {
    return NextResponse.json({
      paymentsEnabled: false,
      accountId: null,
      chargesEnabled: true,
      payoutsEnabled: true,
      needsOnboarding: false,
    });
  }

  const uid = session.user.id;
  const [row] = await sql`
    SELECT stripe_connect_account_id, stripe_charges_enabled, stripe_payouts_enabled
    FROM users
    WHERE id = ${uid}
    LIMIT 1
  `;

  const accountId = row?.stripe_connect_account_id as string | null;
  if (!accountId) {
    return NextResponse.json({
      paymentsEnabled: true,
      accountId: null,
      chargesEnabled: false,
      payoutsEnabled: false,
      needsOnboarding: true,
    });
  }

  const acc = await stripe.accounts.retrieve(accountId);
  const chargesEnabled = Boolean(acc.charges_enabled);
  const payoutsEnabled = Boolean(acc.payouts_enabled);

  if (
    chargesEnabled !== Boolean(row.stripe_charges_enabled) ||
    payoutsEnabled !== Boolean(row.stripe_payouts_enabled)
  ) {
    await sql`
      UPDATE users
      SET
        stripe_charges_enabled = ${chargesEnabled},
        stripe_payouts_enabled = ${payoutsEnabled}
      WHERE id = ${uid}
    `;
  }

  return NextResponse.json({
    paymentsEnabled: true,
    accountId,
    chargesEnabled,
    payoutsEnabled,
    needsOnboarding: !chargesEnabled,
  });
}
