import type Stripe from "stripe";

export type LiveSellerPlanResult =
  | { ok: true; active: false; stripeStatus: null; currentPeriodEnd: null }
  | { ok: true; active: true; stripeStatus: string; currentPeriodEnd: Date | null }
  | { ok: false; error: "stripe_error" };

/**
 * Authoritative check for seller plan: looks up Stripe subscriptions for the customer
 * and matches the configured recurring price. Do not rely on DB status for access control.
 */
export async function getLiveSellerPlanForPrice(
  stripe: Stripe,
  customerId: string,
  priceId: string
): Promise<LiveSellerPlanResult> {
  try {
    for (const status of ["active", "trialing"] as const) {
      let startingAfter: string | undefined;
      for (;;) {
        const page = await stripe.subscriptions.list({
          customer: customerId,
          status,
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        });
        for (const sub of page.data) {
          for (const item of sub.items.data) {
            const pid = typeof item.price === "string" ? item.price : item.price.id;
            if (pid !== priceId) continue;
            const end = (sub as Stripe.Subscription & { current_period_end?: number }).current_period_end;
            const currentPeriodEnd =
              end != null && typeof end === "number" ? new Date(end * 1000) : null;
            return {
              ok: true,
              active: true,
              stripeStatus: sub.status,
              currentPeriodEnd,
            };
          }
        }
        if (!page.has_more) break;
        const last = page.data[page.data.length - 1];
        if (!last) break;
        startingAfter = last.id;
      }
    }
    return { ok: true, active: false, stripeStatus: null, currentPeriodEnd: null };
  } catch (e) {
    console.error("[seller-subscription-stripe-verify]", e);
    return { ok: false, error: "stripe_error" };
  }
}
