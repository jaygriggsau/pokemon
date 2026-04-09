import { sql } from "@/lib/db";
import { formatListingMinorAmount } from "@/lib/listing-money";
import type { ListingCurrency } from "@/lib/marketplace";
import { getSiteUrl } from "@/lib/site-url";
import { listingSharePath } from "@/lib/listing-share";

export type ListingOgRow = {
  id: number;
  card_name: string;
  set_name: string | null;
  condition_grade: string;
  price_cents: number;
  currency: ListingCurrency;
  status: string;
  card_image: string | null;
  photo_front: string;
};

function absoluteAssetUrl(site: string, url: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  try {
    return new URL(url, `${site}/`).href;
  } catch {
    return undefined;
  }
}

export async function getListingOgRow(listingId: number): Promise<ListingOgRow | null> {
  const rows = await sql`
    SELECT id, card_name, set_name, condition_grade, price_cents, currency, status, card_image, photo_front
    FROM marketplace_listings
    WHERE id = ${listingId}
    LIMIT 1
  `;
  const row = rows[0] as ListingOgRow | undefined;
  return row ?? null;
}

export function buildListingShareMetadata(row: ListingOgRow) {
  const site = getSiteUrl();
  const path = listingSharePath(row);
  const price = formatListingMinorAmount(row.price_cents, row.currency);
  const title = `${row.card_name} · ${row.condition_grade} · ${price}`;
  const statusLabel =
    row.status === "active" ? "For sale" : row.status === "sold" ? "Sold" : "Unavailable";
  const description = [row.set_name, statusLabel, "pokemove marketplace"].filter(Boolean).join(" · ");
  const image =
    absoluteAssetUrl(site, row.card_image) ?? absoluteAssetUrl(site, row.photo_front) ?? undefined;

  return { title, description, image, path, site };
}
