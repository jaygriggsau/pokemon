/** Stripe subscription statuses that allow creating marketplace listings. */
export function isSellerSubscriptionActive(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}

export function sellerSubscriptionPriceId(): string | null {
  const id = process.env.STRIPE_SELLER_SUBSCRIPTION_PRICE_ID?.trim();
  return id || null;
}

export function sellerSubscriptionConfigured(): boolean {
  return Boolean(sellerSubscriptionPriceId());
}
