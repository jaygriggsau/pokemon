/**
 * Human-readable listing URLs: /marketplace/charizard-vmax-42
 * The numeric id is always the trailing segment after the last hyphen.
 */

export function slugifyCardName(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
  const trimmed = s.slice(0, 72).replace(/-+$/g, "");
  return trimmed || "listing";
}

export function listingShareSegment(listing: { id: number; card_name: string }): string {
  return `${slugifyCardName(listing.card_name)}-${listing.id}`;
}

export function listingSharePath(listing: { id: number; card_name: string }): string {
  return `/marketplace/${listingShareSegment(listing)}`;
}

/** Accepts plain id ("42") or slug-id ("pikachu-ex-42"). */
export function parseListingUrlSegment(segment: string): number | null {
  const s = segment.trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
  }
  const m = s.match(/-(\d+)$/);
  if (m) {
    const n = parseInt(m[1], 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
