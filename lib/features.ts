/**
 * Peer listings, messaging, and Stripe checkout for listings.
 * Set NEXT_PUBLIC_MARKETPLACE_ENABLED=true (or "1") to turn back on.
 */
export function marketplaceEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_MARKETPLACE_ENABLED;
  return v === "true" || v === "1";
}
