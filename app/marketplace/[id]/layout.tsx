import type { Metadata } from "next";
import { buildListingShareMetadata, getListingOgRow } from "@/lib/listing-meta-server";
import { parseListingUrlSegment } from "@/lib/listing-share";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: raw } = await params;
  const listingId = parseListingUrlSegment(raw);
  if (listingId == null) {
    return { title: "Listing" };
  }

  const row = await getListingOgRow(listingId);
  if (!row) {
    return { title: "Listing not found" };
  }

  const { title, description, image, path, site } = buildListingShareMetadata(row);
  const url = `${site}${path}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url,
      siteName: "pokemove",
      type: "website",
      images: image ? [{ url: image, alt: row.card_name }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default function MarketplaceListingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
