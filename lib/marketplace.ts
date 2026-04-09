import { isVercelBlobPublicUrl } from "./blob-host";

export const LISTING_CONDITIONS = [
  "Near Mint",
  "Lightly Played",
  "Moderately Played",
  "Heavily Played",
  "Damaged",
] as const;

export type ListingCondition = (typeof LISTING_CONDITIONS)[number];

export { LISTING_CURRENCIES, type ListingCurrency } from "./listing-money";

/** HTTPS URLs on Vercel Blob (upload via /api/marketplace/upload). */
export function validateListingPhotoUrl(url: unknown, field: string): string | null {
  if (typeof url !== "string" || !url.trim()) return `${field} is required`;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return `${field} must be a valid URL`;
  }
  if (u.protocol !== "https:") return `${field} must use HTTPS`;
  if (!isVercelBlobPublicUrl(url.trim())) {
    return `${field} must be a Vercel Blob image URL from the marketplace upload flow`;
  }
  if (url.length > 2048) return `${field} URL is too long`;
  return null;
}

function centsNumeric(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value.trim());
  return NaN;
}

export function parsePositiveCents(value: unknown, label: string): { ok: true; cents: number } | { ok: false; error: string } {
  const n = centsNumeric(value);
  if (!Number.isFinite(n) || n <= 0) return { ok: false, error: `${label} must be a positive whole number of cents` };
  if (!Number.isInteger(n)) return { ok: false, error: `${label} must be a whole number of cents` };
  return { ok: true, cents: n };
}

export function parseNonNegativeCents(value: unknown, label: string): { ok: true; cents: number } | { ok: false; error: string } {
  const n = centsNumeric(value);
  if (!Number.isFinite(n) || n < 0) return { ok: false, error: `${label} must be zero or a positive whole number of cents` };
  if (!Number.isInteger(n)) return { ok: false, error: `${label} must be a whole number of cents` };
  return { ok: true, cents: n };
}
