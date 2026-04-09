"use client";

import Link from "next/link";
import Image from "next/image";
import { formatListingMinorAmount } from "@/lib/listing-money";
import type { ListingCurrency } from "@/lib/marketplace";
import { SellerRating } from "@/components/SellerRating";
import { listingSharePath } from "@/lib/listing-share";

export type ListingCardData = {
  id: number;
  card_id: number;
  card_name: string;
  set_name: string | null;
  card_image: string | null;
  condition_grade: string;
  price_cents: number;
  postage_cents: number;
  currency: ListingCurrency;
  seller_name: string | null;
  seller_review_count: number | null;
  seller_avg_rating: string | number | null;
};

export function MarketplaceListingCard({ listing }: { listing: ListingCardData }) {
  const cur = listing.currency;
  const item = formatListingMinorAmount(listing.price_cents, cur);
  const post =
    listing.postage_cents > 0 ? formatListingMinorAmount(listing.postage_cents, cur) : "Free";

  return (
    <Link
      href={listingSharePath(listing)}
      className="card-surface flex flex-col overflow-hidden min-w-0 transition-transform hover:scale-[1.01] active:scale-[0.99]"
    >
      <div
        className="relative w-full flex items-center justify-center"
        style={{ background: "var(--surface-raised)", aspectRatio: "5/7" }}
      >
        {listing.card_image ? (
          <Image
            src={listing.card_image}
            alt=""
            fill
            className="object-contain p-2"
            sizes="(max-width: 639px) 45vw, 200px"
            loading="lazy"
            quality={85}
          />
        ) : (
          <span className="text-4xl font-black" style={{ color: "var(--border)" }}>
            ?
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col gap-2 flex-1 min-w-0">
        <div>
          <p className="font-semibold text-sm leading-tight line-clamp-2">{listing.card_name}</p>
          {listing.set_name && (
            <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--muted)" }}>
              {listing.set_name}
            </p>
          )}
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            {listing.condition_grade}
          </p>
        </div>
        <SellerRating avg={listing.seller_avg_rating} count={listing.seller_review_count} />
        <div className="mt-auto pt-1 border-t" style={{ borderColor: "var(--border)" }}>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Item + postage
          </p>
          <p className="font-bold text-sm" style={{ color: "var(--text)" }}>
            {item}
            <span className="font-normal text-xs" style={{ color: "var(--muted)" }}>
              {" "}
              + {post}
            </span>
          </p>
        </div>
      </div>
    </Link>
  );
}
