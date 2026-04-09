/**
 * Env helpers for the seller subscription product. Access control must use live Stripe
 * verification — see `getLiveSellerPlanForPrice` in `seller-subscription-stripe-verify.ts`.
 * Webhooks still write `seller_subscription_*` columns on `users` for support and reconciliation.
 */

export function sellerSubscriptionPriceId(): string | null {
  const id = process.env.STRIPE_SELLER_SUBSCRIPTION_PRICE_ID?.trim();
  return id || null;
}

export function sellerSubscriptionConfigured(): boolean {
  return Boolean(sellerSubscriptionPriceId());
}
