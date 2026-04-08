import Stripe from "stripe";

let stripeSingleton: Stripe | null | undefined;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (stripeSingleton === undefined) {
    stripeSingleton = new Stripe(key);
  }
  return stripeSingleton;
}

export function stripePaymentsEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

/** Platform fee in cents (remainder goes to the seller after Stripe processing fees). */
export function platformFeeCents(totalCents: number): number {
  const bps = Math.min(50_000, Math.max(0, parseInt(process.env.STRIPE_PLATFORM_FEE_BPS ?? "500", 10)));
  const fee = Math.floor((totalCents * bps) / 10_000);
  const maxFee = Math.max(0, totalCents - 1);
  return Math.min(fee, maxFee);
}

export function appOrigin(): string {
  const u = process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "");
  return u || "http://localhost:3000";
}
