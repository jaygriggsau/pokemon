"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ReviewPendingBanner } from "@/components/ReviewPendingBanner";
import { MarketplaceListingCard, type ListingCardData } from "@/components/MarketplaceListingCard";

function MarketplaceContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const cardIdFilter = searchParams.get("cardId");
  const [listings, setListings] = useState<ListingCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = cardIdFilter ? `?cardId=${encodeURIComponent(cardIdFilter)}` : "";
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/marketplace/listings${q}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed to load");
        return d;
      })
      .then((d) => {
        if (cancelled) return;
        setListings(d.listings ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Couldn’t load listings.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cardIdFilter]);

  return (
    <div className="flex flex-col gap-6">
      <ReviewPendingBanner />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Listings</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            Buy and sell cards peer-to-peer with photos. Use <strong>Messages</strong> to chat with the other party before you buy. When card payments are enabled, checkout runs on Stripe; sellers receive payouts through Stripe (bank withdrawals in the seller dashboard). Arrange shipping with the other party after purchase.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0 self-start sm:self-auto">
          {session && (
            <Link href="/marketplace/orders" className="btn-ghost text-sm">
              My orders
            </Link>
          )}
          <Link href="/marketplace/sell" className="btn-primary text-sm">
            Sell a card
          </Link>
        </div>
      </div>

      {cardIdFilter && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Filtered to listings for this card.{" "}
          <Link href="/marketplace" className="underline" style={{ color: "var(--red)" }}>
            Show all listings
          </Link>
        </p>
      )}

      {error && (
        <div
          className="text-sm px-4 py-3 rounded-lg"
          style={{ background: "rgba(230,57,70,0.08)", border: "1px solid rgba(230,57,70,0.4)", color: "var(--red)" }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20" style={{ color: "var(--muted)" }}>
          <span className="inline-block w-7 h-7 border-2 border-current/30 border-t-current rounded-full animate-spin" />
        </div>
      ) : listings.length === 0 ? (
        <div
          className="rounded-xl py-16 text-center px-4"
          style={{ border: "2px dashed var(--border)", color: "var(--muted)" }}
        >
          <p className="font-semibold mb-1" style={{ color: "var(--text)" }}>
            No active listings
          </p>
          <p className="text-sm mb-4">Be the first to list a card for sale.</p>
          <Link href="/marketplace/sell" className="btn-primary">
            Create listing
          </Link>
        </div>
      ) : (
        <div className="watchlist-grid">
          {listings.map((l) => (
            <MarketplaceListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20" style={{ color: "var(--muted)" }}>
          <span className="inline-block w-7 h-7 border-2 border-current/30 border-t-current rounded-full animate-spin" />
        </div>
      }
    >
      <MarketplaceContent />
    </Suspense>
  );
}
