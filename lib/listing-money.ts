/**
 * Listing amounts are stored as integer minor units (e.g. USD cents, JPY yen).
 * Aligned with the navbar display currencies in `currency-context.tsx`.
 */

export const LISTING_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "JPY",
  "CHF",
  "PLN",
  "SEK",
  "NOK",
] as const;

export type ListingCurrency = (typeof LISTING_CURRENCIES)[number];

/** Stripe: charge amounts use zero-decimal currencies as the major unit (e.g. 500 = ¥500). */
const ZERO_DECIMAL = new Set<string>([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

export function isZeroDecimalCurrency(currency: string): boolean {
  return ZERO_DECIMAL.has(currency.toUpperCase());
}

/** Convert stored minor units to a major-unit number for display (e.g. cents → dollars). */
export function minorUnitsToMajor(minor: number, currency: string): number {
  if (isZeroDecimalCurrency(currency)) return minor;
  return minor / 100;
}

export function formatListingMinorAmount(minor: number, currency: string): string {
  const major = minorUnitsToMajor(minor, currency);
  const z = isZeroDecimalCurrency(currency);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: z ? 0 : 2,
    maximumFractionDigits: z ? 0 : 2,
  }).format(major);
}

/** Parse sell-form input: decimal majors for 2dp currencies, integer majors for JPY, etc. */
export function parsePriceInputToMinorUnits(raw: string, currency: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  if (isZeroDecimalCurrency(currency)) {
    const n = parseInt(s.replace(/[^\d]/g, ""), 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  }
  const n = parseFloat(s.replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export function parsePostageInputToMinorUnits(raw: string, currency: string): number | null {
  const s = raw.trim();
  if (!s || s === "0") return 0;
  if (isZeroDecimalCurrency(currency)) {
    const n = parseInt(s.replace(/[^\d]/g, ""), 10);
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  }
  const n = parseFloat(s.replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/** Stripe minimum charge amounts (smallest currency unit). See https://docs.stripe.com/currencies */
const STRIPE_MIN_MINOR: Record<string, number> = {
  USD: 50,
  EUR: 50,
  GBP: 30,
  CAD: 50,
  AUD: 50,
  JPY: 50,
  CHF: 50,
  PLN: 200,
  SEK: 300,
  NOK: 300,
};

export function stripeMinimumChargeMinor(currency: string): number {
  return STRIPE_MIN_MINOR[currency.toUpperCase()] ?? 50;
}
